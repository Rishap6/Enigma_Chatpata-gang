import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.notification_preference import NotificationPreference
from app.models.family_member import FamilyMember
from app.models.family_notification import FamilyNotification
from app.models.risk_finding import RiskFinding
from app.models.risk_analysis import RiskAnalysis
from app.models.family import Family
from app.schemas.notification import NotificationPreferenceUpdate, HouseholdNotificationResponse
from app.schemas.history import RecurringPatternItem
from app.services.member_service import MemberService
from app.services.family_service import FamilyService
from app.services.notification_channels import WhatsAppDemoChannel

logger = logging.getLogger(__name__)

DISCLAIMER_SNIPPET = (
    "This is an informational decision-support tool, not medical advice. "
    "Always inspect physical packaging before consumption."
)


class NotificationService:
    # ------------------------------------------------------------------
    # Phase 1: Notification preferences (unchanged)
    # ------------------------------------------------------------------
    @staticmethod
    async def get_or_create_notification_preferences(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID
    ) -> NotificationPreference:
        member = await MemberService.verify_member_owner(db, user_id, member_id)
        if member.notification_preferences:
            return member.notification_preferences

        pref = NotificationPreference(
            member_id=member_id,
            in_app_enabled=True,
            push_enabled=True,
            whatsapp_enabled=False,
            emergency_call_enabled=False,
        )
        db.add(pref)
        await db.commit()
        await db.refresh(pref)
        return pref

    @staticmethod
    async def update_notification_preferences(
        db: AsyncSession,
        user_id: uuid.UUID,
        member_id: uuid.UUID,
        notif_in: NotificationPreferenceUpdate,
    ) -> NotificationPreference:
        pref = await NotificationService.get_or_create_notification_preferences(db, user_id, member_id)
        if notif_in.in_app_enabled is not None:
            pref.in_app_enabled = notif_in.in_app_enabled
        if notif_in.push_enabled is not None:
            pref.push_enabled = notif_in.push_enabled
        if notif_in.whatsapp_enabled is not None:
            pref.whatsapp_enabled = notif_in.whatsapp_enabled
        if notif_in.emergency_call_enabled is not None:
            pref.emergency_call_enabled = notif_in.emergency_call_enabled

        await db.commit()
        await db.refresh(pref)
        return pref

    # ------------------------------------------------------------------
    # Phase 9: In-app alerts
    # ------------------------------------------------------------------
    @staticmethod
    async def _member_in_app_enabled(db: AsyncSession, member_id: uuid.UUID) -> bool:
        stmt = (
            select(NotificationPreference)
            .where(NotificationPreference.member_id == member_id)
        )
        pref = (await db.execute(stmt)).scalars().first()
        if pref is None:
            return True
        return bool(pref.in_app_enabled)

    @staticmethod
    async def _create_if_absent(
        db: AsyncSession,
        *,
        family_id: uuid.UUID,
        recipient_member_id: Optional[uuid.UUID],
        ntype: str,
        title: str,
        message: str,
        source_type: str,
        source_id: Optional[str],
        product_id: Optional[uuid.UUID],
        receipt_id: Optional[uuid.UUID],
        finding_id: Optional[uuid.UUID],
        dedupe_key: str,
    ) -> Optional[FamilyNotification]:
        if recipient_member_id and not await NotificationService._member_in_app_enabled(db, recipient_member_id):
            return None

        exists_stmt = select(FamilyNotification.id).where(
            FamilyNotification.family_id == family_id,
            FamilyNotification.dedupe_key == dedupe_key,
        )
        if (await db.execute(exists_stmt)).first():
            return None

        row = FamilyNotification(
            id=uuid.uuid4(),
            family_id=family_id,
            recipient_member_id=recipient_member_id,
            type=ntype,
            title=title,
            message=message,
            status="unread",
            source_type=source_type,
            source_id=source_id,
            product_id=product_id,
            receipt_id=receipt_id,
            finding_id=finding_id,
            dedupe_key=dedupe_key,
        )
        db.add(row)
        await db.flush()
        return row

    @staticmethod
    def _action_for_notification(notif: FamilyNotification) -> Tuple[str, str]:
        if notif.type == "HIGH_ATTENTION" and notif.receipt_id and notif.finding_id:
            return (
                "View finding",
                f"/risk/receipts/{notif.receipt_id}?findingId={notif.finding_id}",
            )
        if notif.type == "VERIFICATION_REQUIRED":
            if notif.receipt_id and notif.finding_id:
                return (
                    "Review product",
                    f"/risk/receipts/{notif.receipt_id}?findingId={notif.finding_id}",
                )
            if notif.product_id:
                return ("Review product", f"/products/{notif.product_id}")
        if notif.type == "RECURRING_PATTERN":
            return ("View history", "/history?tab=patterns")
        if notif.receipt_id:
            return ("View receipt", f"/receipts/{notif.receipt_id}")
        return ("View notifications", "/notifications")

    @staticmethod
    def _to_response(
        notif: FamilyNotification,
        *,
        product_name: Optional[str] = None,
        member_name: Optional[str] = None,
        whatsapp_preview=None,
    ) -> HouseholdNotificationResponse:
        action_label, action_path = NotificationService._action_for_notification(notif)
        data = {
            "id": notif.id,
            "family_id": notif.family_id,
            "recipient_member_id": notif.recipient_member_id,
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
            "status": notif.status,
            "source_type": notif.source_type,
            "source_id": notif.source_id,
            "product_id": notif.product_id,
            "receipt_id": notif.receipt_id,
            "finding_id": notif.finding_id,
            "created_at": notif.created_at,
            "read_at": notif.read_at,
            "product_name": product_name,
            "member_name": member_name,
            "action_label": action_label,
            "action_path": action_path,
        }
        if whatsapp_preview:
            data["whatsapp_demo_preview"] = whatsapp_preview
        return HouseholdNotificationResponse(**data)

    @staticmethod
    async def generate_for_risk_analysis(
        db: AsyncSession,
        family_id: uuid.UUID,
        receipt_id: uuid.UUID,
        risk_analysis_id: uuid.UUID,
    ) -> int:
        stmt = (
            select(RiskFinding)
            .options(
                selectinload(RiskFinding.member).selectinload(
                    FamilyMember.notification_preferences
                ),
                selectinload(RiskFinding.product),
                selectinload(RiskFinding.risk_analysis),
            )
            .where(
                RiskFinding.risk_analysis_id == risk_analysis_id,
                RiskFinding.status.in_(["high_attention", "verification_required"]),
            )
        )
        findings = (await db.execute(stmt)).scalars().all()
        created = 0

        for finding in findings:
            member = finding.member
            product = finding.product
            member_name = member.name if member else "Household member"
            product_name = product.name if product else "Purchased product"

            if finding.status == "high_attention":
                ntype = "HIGH_ATTENTION"
                title = f"Attention needed for {member_name}"
                message = (
                    f"{product_name} has a purchase finding related to {member_name}'s "
                    f"configured requirements. {DISCLAIMER_SNIPPET}"
                )
            else:
                ntype = "VERIFICATION_REQUIRED"
                title = "Product information needs verification"
                message = (
                    f"{product_name} contains an ingredient or statement whose source could not be "
                    f"determined from available product information. Review physical packaging. "
                    f"{DISCLAIMER_SNIPPET}"
                )

            dedupe_key = f"finding:{finding.id}:{ntype}"
            row = await NotificationService._create_if_absent(
                db,
                family_id=family_id,
                recipient_member_id=finding.member_id,
                ntype=ntype,
                title=title,
                message=message,
                source_type="risk_finding",
                source_id=str(finding.id),
                product_id=finding.product_id,
                receipt_id=receipt_id,
                finding_id=finding.id,
                dedupe_key=dedupe_key,
            )
            if row:
                created += 1
                if member and member.notification_preferences and member.notification_preferences.whatsapp_enabled:
                    WhatsAppDemoChannel.build_preview(member.name, title, message)

        if created:
            await db.commit()
        return created

    @staticmethod
    async def generate_recurring_notifications(
        db: AsyncSession,
        family_id: uuid.UUID,
        patterns: List[RecurringPatternItem],
        period_key: str = "all",
    ) -> int:
        created = 0
        for pattern in patterns:
            purchase_count = pattern.supporting_purchase_count
            receipt_count = len(pattern.supporting_receipt_ids)
            if purchase_count < 3 and receipt_count < 3:
                continue

            source_id = f"{pattern.pattern_type}:{period_key}"
            dedupe_key = f"pattern:{source_id}"
            title = "Recurring grocery pattern"
            message = (
                f"{pattern.title}: {pattern.description} "
                f"This finding appeared across {max(purchase_count, receipt_count)} purchase records. "
                f"{DISCLAIMER_SNIPPET}"
            )
            sample_finding_id = None
            if pattern.sample_finding_id:
                try:
                    sample_finding_id = uuid.UUID(pattern.sample_finding_id)
                except ValueError:
                    sample_finding_id = None

            row = await NotificationService._create_if_absent(
                db,
                family_id=family_id,
                recipient_member_id=None,
                ntype="RECURRING_PATTERN",
                title=title,
                message=message,
                source_type="historical_pattern",
                source_id=source_id,
                product_id=None,
                receipt_id=None,
                finding_id=sample_finding_id,
                dedupe_key=dedupe_key,
            )
            if row:
                created += 1

        if created:
            await db.commit()
        return created

    @staticmethod
    async def generate_after_risk_pipeline(
        db: AsyncSession,
        family_id: uuid.UUID,
        receipt_id: uuid.UUID,
        risk_analysis_id: uuid.UUID,
    ) -> int:
        """Called downstream of risk analysis + history sync."""
        from app.services.historical_grocery_service import historical_grocery_service

        total = await NotificationService.generate_for_risk_analysis(
            db, family_id, receipt_id, risk_analysis_id
        )
        patterns_resp = await historical_grocery_service.get_recurring_patterns(db, family_id, "all")
        total += await NotificationService.generate_recurring_notifications(
            db, family_id, patterns_resp.patterns, period_key="all"
        )
        return total

    @staticmethod
    async def generate_for_family(
        db: AsyncSession,
        user_id: uuid.UUID,
        family_id: uuid.UUID,
    ) -> int:
        await FamilyService.verify_family_owner(db, user_id, family_id)
        from app.services.historical_grocery_service import historical_grocery_service

        patterns_resp = await historical_grocery_service.get_recurring_patterns(db, family_id, "all")
        return await NotificationService.generate_recurring_notifications(
            db, family_id, patterns_resp.patterns, period_key="all"
        )

    @staticmethod
    async def list_notifications(
        db: AsyncSession,
        user_id: uuid.UUID,
        family_id: uuid.UUID,
        *,
        status_filter: Optional[str] = None,
        type_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[HouseholdNotificationResponse], int]:
        await FamilyService.verify_family_owner(db, user_id, family_id)

        base = select(FamilyNotification).where(FamilyNotification.family_id == family_id)
        if status_filter:
            base = base.where(FamilyNotification.status == status_filter)
        if type_filter:
            base = base.where(FamilyNotification.type == type_filter)

        filters = [FamilyNotification.family_id == family_id]
        if status_filter:
            filters.append(FamilyNotification.status == status_filter)
        if type_filter:
            filters.append(FamilyNotification.type == type_filter)
        count_stmt = select(func.count(FamilyNotification.id)).where(and_(*filters))
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = (
            base.options(
                selectinload(FamilyNotification.product),
                selectinload(FamilyNotification.recipient_member),
            )
            .order_by(desc(FamilyNotification.created_at))
            .limit(limit)
            .offset(offset)
        )
        rows = (await db.execute(stmt)).scalars().all()
        items = [
            NotificationService._to_response(
                n,
                product_name=n.product.name if n.product else None,
                member_name=n.recipient_member.name if n.recipient_member else None,
            )
            for n in rows
        ]
        return items, int(total)

    @staticmethod
    async def get_notification(
        db: AsyncSession,
        user_id: uuid.UUID,
        notification_id: uuid.UUID,
    ) -> HouseholdNotificationResponse:
        stmt = (
            select(FamilyNotification)
            .options(
                selectinload(FamilyNotification.family),
                selectinload(FamilyNotification.product),
                selectinload(FamilyNotification.recipient_member),
            )
            .where(FamilyNotification.id == notification_id)
        )
        notif = (await db.execute(stmt)).scalars().first()
        if not notif or not notif.family or notif.family.owner_user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        return NotificationService._to_response(
            notif,
            product_name=notif.product.name if notif.product else None,
            member_name=notif.recipient_member.name if notif.recipient_member else None,
        )

    @staticmethod
    async def unread_count(
        db: AsyncSession,
        user_id: uuid.UUID,
        family_id: uuid.UUID,
    ) -> int:
        await FamilyService.verify_family_owner(db, user_id, family_id)
        stmt = select(func.count()).where(
            and_(
                FamilyNotification.family_id == family_id,
                FamilyNotification.status == "unread",
            )
        )
        return int((await db.execute(stmt)).scalar() or 0)

    @staticmethod
    async def mark_read(
        db: AsyncSession,
        user_id: uuid.UUID,
        notification_id: uuid.UUID,
    ) -> HouseholdNotificationResponse:
        stmt = (
            select(FamilyNotification)
            .options(
                selectinload(FamilyNotification.family),
                selectinload(FamilyNotification.product),
                selectinload(FamilyNotification.recipient_member),
            )
            .where(FamilyNotification.id == notification_id)
        )
        notif = (await db.execute(stmt)).scalars().first()
        if not notif or not notif.family or notif.family.owner_user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        if notif.status != "read":
            notif.status = "read"
            notif.read_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(notif)
        return NotificationService._to_response(
            notif,
            product_name=notif.product.name if notif.product else None,
            member_name=notif.recipient_member.name if notif.recipient_member else None,
        )

    @staticmethod
    async def mark_all_read(
        db: AsyncSession,
        user_id: uuid.UUID,
        family_id: uuid.UUID,
    ) -> int:
        await FamilyService.verify_family_owner(db, user_id, family_id)
        stmt = select(FamilyNotification).where(
            and_(
                FamilyNotification.family_id == family_id,
                FamilyNotification.status == "unread",
            )
        )
        rows = (await db.execute(stmt)).scalars().all()
        now = datetime.now(timezone.utc)
        for row in rows:
            row.status = "read"
            row.read_at = now
        await db.commit()
        return len(rows)
