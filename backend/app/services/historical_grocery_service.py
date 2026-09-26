import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
from calendar import monthrange
from sqlalchemy import select, func, desc, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.family import Family
from app.models.family_member import FamilyMember
from app.models.receipt import Receipt
from app.models.receipt_item import ReceiptItem
from app.models.product import Product
from app.models.product_ingredient import ProductIngredient
from app.models.ingredient import Ingredient
from app.models.risk_analysis import RiskAnalysis
from app.models.risk_finding import RiskFinding
from app.models.risk_finding_path import RiskFindingPath
from app.models.historical_risk_snapshot import HistoricalRiskSnapshot
from app.models.product_purchase_history import ProductPurchaseHistory
from app.models.family_trend_snapshot import FamilyTrendSnapshot
from app.models.member_trend_event import MemberTrendEvent

from app.schemas.history import (
    HistoricalSummaryResponse,
    RecurringProductItem,
    RecurringProductsResponse,
    AffectedMemberInfo,
    RecurringIngredientItem,
    RecurringIngredientsResponse,
    MemberHistoryImpactItem,
    MemberRequirementTrend,
    MemberHistoryResponse,
    PeriodMetrics,
    PeriodComparisonResponse,
    RecurringPatternItem,
    RecurringFindingsResponse,
    HistoricalCoverageResponse,
    MonthlyFamilyReportResponse,
    TimelineEvent,
    FamilyHistoryOverviewResponse,
)


class HistoricalGroceryService:
    """Production-grade historical grocery intelligence & family trend engine.
    Analyzes multi-receipt grocery purchase records over time without implying consumption.
    Strictly factual, deterministic, and explainable.
    """

    # ---------------------------------------------------------
    # Date Range Resolution
    # ---------------------------------------------------------

    def resolve_date_range(
        self,
        period: Optional[str] = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Tuple[Optional[datetime], Optional[datetime], str]:
        """Resolves standard preset periods into (start_dt, end_dt, display_name)."""
        now = datetime.now(timezone.utc)

        if period == "7d":
            start = now - timedelta(days=7)
            return start, now, "Last 7 Days"
        elif period == "30d":
            start = now - timedelta(days=30)
            return start, now, "Last 30 Days"
        elif period == "90d":
            start = now - timedelta(days=90)
            return start, now, "Last 90 Days"
        elif period == "current_month":
            start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
            return start, now, f"{now.strftime('%B %Y')}"
        elif period == "previous_month":
            first_of_curr = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
            last_of_prev = first_of_curr - timedelta(days=1)
            first_of_prev = datetime(last_of_prev.year, last_of_prev.month, 1, tzinfo=timezone.utc)
            end_of_prev = datetime(last_of_prev.year, last_of_prev.month, last_of_prev.day, 23, 59, 59, tzinfo=timezone.utc)
            return first_of_prev, end_of_prev, f"{first_of_prev.strftime('%B %Y')}"
        elif period == "custom" and start_date and end_date:
            return start_date, end_date, f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}"
        else:
            return None, None, "All Time"

    # ---------------------------------------------------------
    # Synchronization & Ingestion
    # ---------------------------------------------------------

    async def sync_family_history(self, db: AsyncSession, family_id: uuid.UUID) -> int:
        """Synchronizes all existing receipts & risk analyses for a family into
        historical_risk_snapshots, product_purchase_history, and member_trend_events.
        Idempotent operation.
        """
        # Load Family
        fam = await db.get(Family, family_id)
        if not fam:
            raise ValueError("Family not found")

        # Find receipts associated with this family directly or via owner
        stmt_rcpt = (
            select(Receipt)
            .options(
                selectinload(Receipt.items).selectinload(ReceiptItem.product),
            )
            .where(
                or_(
                    Receipt.family_id == family_id,
                    and_(Receipt.family_id.is_(None), Receipt.owner_user_id == fam.owner_user_id),
                )
            )
            .order_by(Receipt.created_at.asc())
        )
        receipts = (await db.execute(stmt_rcpt)).scalars().all()

        synced_count = 0
        for rcpt in receipts:
            # Associate receipt with family if null
            if not rcpt.family_id:
                rcpt.family_id = family_id

            purchase_dt = rcpt.purchase_date or rcpt.created_at

            # Find latest RiskAnalysis for this receipt
            stmt_ra = (
                select(RiskAnalysis)
                .options(selectinload(RiskAnalysis.findings))
                .where(RiskAnalysis.receipt_id == rcpt.id)
                .order_by(desc(RiskAnalysis.created_at))
            )
            risk_analysis = (await db.execute(stmt_ra)).scalars().first()

            # 1. Upsert HistoricalRiskSnapshot
            stmt_snap = select(HistoricalRiskSnapshot).where(HistoricalRiskSnapshot.receipt_id == rcpt.id)
            snapshot = (await db.execute(stmt_snap)).scalars().first()
            if not snapshot:
                snapshot = HistoricalRiskSnapshot(
                    id=uuid.uuid4(),
                    family_id=family_id,
                    receipt_id=rcpt.id,
                )
                db.add(snapshot)

            matched = [it for it in rcpt.items if it.product_id is not None]
            unresolved = [it for it in rcpt.items if it.product_id is None]

            snapshot.risk_analysis_id = risk_analysis.id if risk_analysis else None
            snapshot.purchase_date = purchase_dt
            snapshot.total_products = len(rcpt.items)
            snapshot.matched_products = len(matched)
            snapshot.unresolved_products = len(unresolved)

            if risk_analysis:
                snapshot.high_attention_count = risk_analysis.high_attention_count
                snapshot.potential_conflict_count = risk_analysis.potential_conflict_count
                snapshot.verification_required_count = risk_analysis.verification_count
                snapshot.no_configured_conflict_count = risk_analysis.no_conflict_count
            else:
                snapshot.insufficient_information_count = len(unresolved)

            # 2. Upsert ProductPurchaseHistory
            for item in matched:
                stmt_pph = select(ProductPurchaseHistory).where(
                    ProductPurchaseHistory.receipt_id == rcpt.id,
                    ProductPurchaseHistory.product_id == item.product_id,
                )
                pph = (await db.execute(stmt_pph)).scalars().first()
                if not pph:
                    pph = ProductPurchaseHistory(
                        id=uuid.uuid4(),
                        family_id=family_id,
                        product_id=item.product_id,
                        receipt_id=rcpt.id,
                    )
                    db.add(pph)

                pph.purchase_date = purchase_dt
                pph.quantity = item.quantity if item.quantity is not None else 1.0
                pph.unit_price = item.unit_price
                if item.total_price is not None:
                    pph.total_price = item.total_price
                elif item.unit_price is not None:
                    pph.total_price = round(float(item.quantity or 1.0) * float(item.unit_price), 2)
                else:
                    pph.total_price = None
                pph.match_confidence = item.match_confidence

            # 3. Upsert MemberTrendEvents
            if risk_analysis and risk_analysis.findings:
                for finding in risk_analysis.findings:
                    stmt_mte = select(MemberTrendEvent).where(
                        MemberTrendEvent.receipt_id == rcpt.id,
                        MemberTrendEvent.finding_id == finding.id,
                    )
                    mte = (await db.execute(stmt_mte)).scalars().first()
                    if not mte:
                        mte = MemberTrendEvent(
                            id=uuid.uuid4(),
                            family_id=family_id,
                            member_id=finding.member_id,
                            receipt_id=rcpt.id,
                            product_id=finding.product_id,
                            finding_id=finding.id,
                        )
                        db.add(mte)

                    mte.purchase_date = purchase_dt
                    mte.conflict_type = finding.risk_type
                    mte.status = finding.status

            synced_count += 1

        await db.commit()
        return synced_count

    # ---------------------------------------------------------
    # 1. Summary
    # ---------------------------------------------------------

    async def get_summary(
        self,
        db: AsyncSession,
        family_id: uuid.UUID,
        period: Optional[str] = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> HistoricalSummaryResponse:
        """Computes executive-level historical grocery summary for the given period."""
        # Ensure latest sync
        await self.sync_family_history(db, family_id)

        start_dt, end_dt, period_name = self.resolve_date_range(period, start_date, end_date)

        # Query snapshots
        snap_query = select(HistoricalRiskSnapshot).where(HistoricalRiskSnapshot.family_id == family_id)
        if start_dt:
            snap_query = snap_query.where(HistoricalRiskSnapshot.purchase_date >= start_dt)
        if end_dt:
            snap_query = snap_query.where(HistoricalRiskSnapshot.purchase_date <= end_dt)

        snapshots = (await db.execute(snap_query)).scalars().all()

        total_receipts = len(snapshots)
        total_purchased_products = sum(s.total_products for s in snapshots)
        unresolved_products = sum(s.unresolved_products for s in snapshots)
        high_attention = sum(s.high_attention_count for s in snapshots)
        potential_conflict = sum(s.potential_conflict_count for s in snapshots)
        verification_req = sum(s.verification_required_count for s in snapshots)
        no_conflict = sum(s.no_configured_conflict_count for s in snapshots)
        insufficient_info = sum(s.insufficient_information_count for s in snapshots)

        # Total spend & unique products from ProductPurchaseHistory
        pph_query = select(ProductPurchaseHistory).where(ProductPurchaseHistory.family_id == family_id)
        if start_dt:
            pph_query = pph_query.where(ProductPurchaseHistory.purchase_date >= start_dt)
        if end_dt:
            pph_query = pph_query.where(ProductPurchaseHistory.purchase_date <= end_dt)

        purchases = (await db.execute(pph_query)).scalars().all()
        total_spend = sum(float(p.total_price or 0.0) for p in purchases)
        unique_product_ids = set(p.product_id for p in purchases)

        # Count recurring products (purchased >= 2 times in period)
        prod_counts: Dict[uuid.UUID, int] = {}
        for p in purchases:
            prod_counts[p.product_id] = prod_counts.get(p.product_id, 0) + 1
        recurring_count = sum(1 for c in prod_counts.values() if c >= 2)

        matched_products_count = sum(s.matched_products for s in snapshots)
        coverage_pct = round((matched_products_count / total_purchased_products * 100), 1) if total_purchased_products > 0 else 100.0

        return HistoricalSummaryResponse(
            family_id=family_id,
            period_type=period or "all",
            period_start=start_dt,
            period_end=end_dt,
            total_receipts=total_receipts,
            total_purchased_products=total_purchased_products,
            total_unique_products=len(unique_product_ids),
            recurring_products_count=recurring_count,
            total_spend=round(total_spend, 2),
            currency="INR",
            high_attention_count=high_attention,
            potential_conflict_count=potential_conflict,
            verification_required_count=verification_req,
            no_configured_conflict_count=no_conflict,
            insufficient_info_count=insufficient_info,
            coverage_percentage=coverage_pct,
            unresolved_products_count=unresolved_products,
        )

    # ---------------------------------------------------------
    # 2. Recurring Product Analysis
    # ---------------------------------------------------------

    async def get_recurring_products(
        self,
        db: AsyncSession,
        family_id: uuid.UUID,
        period: Optional[str] = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> RecurringProductsResponse:
        """Aggregates all products purchased historically with purchase frequencies,
        pricing dynamics, member impact breakdown, and Phase 7 explainability linkages.
        """
        await self.sync_family_history(db, family_id)
        start_dt, end_dt, _ = self.resolve_date_range(period, start_date, end_date)

        # Query ProductPurchaseHistory with Product relationship
        pph_stmt = (
            select(ProductPurchaseHistory)
            .options(
                selectinload(ProductPurchaseHistory.product).selectinload(Product.brand),
            )
            .where(ProductPurchaseHistory.family_id == family_id)
        )
        if start_dt:
            pph_stmt = pph_stmt.where(ProductPurchaseHistory.purchase_date >= start_dt)
        if end_dt:
            pph_stmt = pph_stmt.where(ProductPurchaseHistory.purchase_date <= end_dt)
        pph_stmt = pph_stmt.order_by(ProductPurchaseHistory.purchase_date.asc())

        purchases = (await db.execute(pph_stmt)).scalars().all()

        # Query all MemberTrendEvents for the same period with Member & Finding
        mte_stmt = (
            select(MemberTrendEvent)
            .options(
                selectinload(MemberTrendEvent.member),
                selectinload(MemberTrendEvent.finding),
            )
            .where(MemberTrendEvent.family_id == family_id)
        )
        if start_dt:
            mte_stmt = mte_stmt.where(MemberTrendEvent.purchase_date >= start_dt)
        if end_dt:
            mte_stmt = mte_stmt.where(MemberTrendEvent.purchase_date <= end_dt)

        trend_events = (await db.execute(mte_stmt)).scalars().all()

        # Map events by product_id -> member_id -> list of events
        events_by_product_member: Dict[uuid.UUID, Dict[uuid.UUID, List[MemberTrendEvent]]] = {}
        for ev in trend_events:
            if ev.product_id not in events_by_product_member:
                events_by_product_member[ev.product_id] = {}
            if ev.member_id not in events_by_product_member[ev.product_id]:
                events_by_product_member[ev.product_id][ev.member_id] = []
            events_by_product_member[ev.product_id][ev.member_id].append(ev)

        # Group purchases by product_id
        grouped: Dict[uuid.UUID, List[ProductPurchaseHistory]] = {}
        for p in purchases:
            if p.product_id not in grouped:
                grouped[p.product_id] = []
            grouped[p.product_id].append(p)

        recurring_list: List[RecurringProductItem] = []
        for prod_id, p_list in grouped.items():
            first_p = p_list[0]
            last_p = p_list[-1]
            prod = first_p.product

            purchase_count = len(p_list)
            total_qty = sum(float(x.quantity or 1.0) for x in p_list)
            total_spend = sum(float(x.total_price or 0.0) for x in p_list)
            avg_price = (total_spend / total_qty) if total_qty > 0 else 0.0

            # Calculate price change if unit prices exist
            price_change = None
            if first_p.unit_price is not None and last_p.unit_price is not None and len(p_list) > 1:
                price_change = float(last_p.unit_price) - float(first_p.unit_price)

            unique_receipt_ids = set(x.receipt_id for x in p_list)

            # Analyze member impact for this product
            prod_events = events_by_product_member.get(prod_id, {})
            affected_members: List[AffectedMemberInfo] = []
            all_conflict_types = set()
            high_attention_ev = 0
            potential_conflict_ev = 0
            verification_ev = 0
            no_conflict_ev = 0
            sample_finding_id = None

            for mem_id, ev_list in prod_events.items():
                first_ev = ev_list[0]
                mem_name = first_ev.member.name if first_ev.member else "Family Member"
                relationship = first_ev.member.relationship if first_ev.member else None

                mem_conflicts = list(set(e.conflict_type for e in ev_list if e.conflict_type))
                all_conflict_types.update(mem_conflicts)

                status_counts: Dict[str, int] = {}
                for e in ev_list:
                    status_counts[e.status] = status_counts.get(e.status, 0) + 1
                    if e.status == "high_attention":
                        high_attention_ev += 1
                    elif e.status == "potential_conflict":
                        potential_conflict_ev += 1
                    elif e.status == "verification_required":
                        verification_ev += 1
                    elif e.status == "no_configured_conflict":
                        no_conflict_ev += 1

                    if not sample_finding_id and e.finding_id:
                        sample_finding_id = str(e.finding_id)

                affected_members.append(
                    AffectedMemberInfo(
                        member_id=mem_id,
                        member_name=mem_name,
                        relationship=relationship,
                        conflict_types=mem_conflicts,
                        status_counts=status_counts,
                        sample_finding_id=str(ev_list[0].finding_id) if ev_list[0].finding_id else None,
                    )
                )

            recurring_list.append(
                RecurringProductItem(
                    product_id=prod_id,
                    product_name=prod.name if prod else "Unknown Product",
                    brand_name=prod.brand.name if (prod and prod.brand) else None,
                    purchase_count=purchase_count,
                    total_quantity=round(total_qty, 2),
                    total_spend=round(total_spend, 2),
                    average_price=round(avg_price, 2),
                    price_change=round(price_change, 2) if price_change is not None else None,
                    first_purchase_date=first_p.purchase_date,
                    last_purchase_date=last_p.purchase_date,
                    number_of_receipts=len(unique_receipt_ids),
                    high_attention_events=high_attention_ev,
                    potential_conflict_events=potential_conflict_ev,
                    verification_required_events=verification_ev,
                    no_configured_conflict_events=no_conflict_ev,
                    affected_members=affected_members,
                    recurring_conflict_types=list(all_conflict_types),
                    sample_finding_id=sample_finding_id,
                )
            )

        # Sort: products with highest purchase count and high attention first
        recurring_list.sort(key=lambda x: (x.purchase_count, x.high_attention_events), reverse=True)

        return RecurringProductsResponse(
            family_id=family_id,
            total_products_tracked=len(recurring_list),
            recurring_products=recurring_list,
        )

    # ---------------------------------------------------------
    # 3. Recurring Ingredient Intelligence
    # ---------------------------------------------------------

    async def get_recurring_ingredients(
        self,
        db: AsyncSession,
        family_id: uuid.UUID,
        period: Optional[str] = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> RecurringIngredientsResponse:
        """Aggregates ingredients across all purchased products, accurately separating
        DIRECTLY OBSERVED label ingredients from RELATIONSHIP-DERIVED ingredients (Phase 2).
        Tracks source uncertainties (e.g. INS 471) and affected members.
        """
        await self.sync_family_history(db, family_id)
        start_dt, end_dt, _ = self.resolve_date_range(period, start_date, end_date)

        # 1. Fetch purchased product IDs in period
        pph_stmt = select(ProductPurchaseHistory).where(ProductPurchaseHistory.family_id == family_id)
        if start_dt:
            pph_stmt = pph_stmt.where(ProductPurchaseHistory.purchase_date >= start_dt)
        if end_dt:
            pph_stmt = pph_stmt.where(ProductPurchaseHistory.purchase_date <= end_dt)

        purchases = (await db.execute(pph_stmt)).scalars().all()
        prod_purchase_counts: Dict[uuid.UUID, int] = {}
        for p in purchases:
            prod_purchase_counts[p.product_id] = prod_purchase_counts.get(p.product_id, 0) + 1

        purchased_prod_ids = list(prod_purchase_counts.keys())
        if not purchased_prod_ids:
            return RecurringIngredientsResponse(
                family_id=family_id,
                total_ingredients_observed=0,
                directly_observed=[],
                relationship_derived=[],
            )

        # 2. Query ProductIngredients for these products
        pi_stmt = (
            select(ProductIngredient)
            .options(selectinload(ProductIngredient.ingredient))
            .where(ProductIngredient.product_id.in_(purchased_prod_ids))
        )
        product_ingredients = (await db.execute(pi_stmt)).scalars().all()

        # 3. Query RiskFindings for these products to determine affected members & conflict types
        rf_stmt = (
            select(RiskFinding)
            .options(
                selectinload(RiskFinding.member),
                selectinload(RiskFinding.paths),
            )
            .join(RiskAnalysis, RiskFinding.risk_analysis_id == RiskAnalysis.id)
            .where(
                RiskAnalysis.family_id == family_id,
                RiskFinding.product_id.in_(purchased_prod_ids),
            )
        )
        findings = (await db.execute(rf_stmt)).scalars().all()

        # Map product_id to findings
        findings_by_product: Dict[uuid.UUID, List[RiskFinding]] = {}
        for f in findings:
            if f.product_id not in findings_by_product:
                findings_by_product[f.product_id] = []
            findings_by_product[f.product_id].append(f)

        directly_observed_map: Dict[str, Dict[str, Any]] = {}
        for pi in product_ingredients:
            ing_name = (pi.ingredient.display_name or pi.ingredient.canonical_name) if pi.ingredient else (pi.normalized_name or pi.raw_name)
            clean_name = ing_name.strip().title()
            
            if clean_name not in directly_observed_map:
                directly_observed_map[clean_name] = {
                    "ingredient_id": pi.ingredient_id,
                    "ingredient_name": clean_name,
                    "is_derived": False,
                    "products": set(),
                    "purchase_events": 0,
                    "affected_members": set(),
                    "conflict_types": set(),
                    "source_uncertainty_count": 0,
                }
            
            directly_observed_map[clean_name]["products"].add(pi.product_id)
            directly_observed_map[clean_name]["purchase_events"] += prod_purchase_counts.get(pi.product_id, 1)

            # Check if this ingredient caused source uncertainty (e.g. INS 471)
            is_uncertain = "471" in clean_name.lower() or "emulsifier" in clean_name.lower() or "glyceride" in clean_name.lower()
            if is_uncertain:
                directly_observed_map[clean_name]["source_uncertainty_count"] += prod_purchase_counts.get(pi.product_id, 1)

            # Attach affected members from findings of this product
            for f in findings_by_product.get(pi.product_id, []):
                if f.member:
                    directly_observed_map[clean_name]["affected_members"].add(f.member.name)
                if f.risk_type:
                    directly_observed_map[clean_name]["conflict_types"].add(f.risk_type)

        # 4. Extract Derived Ingredients from RiskFindingPaths
        derived_map: Dict[str, Dict[str, Any]] = {}
        for f in findings:
            if f.paths and len(f.paths) > 1:
                # E.g. Path: Maida -> Wheat -> Gluten
                path_steps = [p.ingredient_name for p in f.paths]
                derived_ingredient = path_steps[-1].strip().title()
                derivation_str = " → ".join(path_steps)

                if derived_ingredient not in derived_map:
                    derived_map[derived_ingredient] = {
                        "ingredient_id": f.paths[-1].ingredient_id,
                        "ingredient_name": derived_ingredient,
                        "is_derived": True,
                        "derivation_path": derivation_str,
                        "products": set(),
                        "purchase_events": 0,
                        "affected_members": set(),
                        "conflict_types": set(),
                        "confidence": float(f.confidence or 0.95),
                        "source_uncertainty_count": 0,
                    }

                derived_map[derived_ingredient]["products"].add(f.product_id)
                derived_map[derived_ingredient]["purchase_events"] += prod_purchase_counts.get(f.product_id, 1)
                if f.member:
                    derived_map[derived_ingredient]["affected_members"].add(f.member.name)
                if f.risk_type:
                    derived_map[derived_ingredient]["conflict_types"].add(f.risk_type)
                if f.source_uncertainty:
                    derived_map[derived_ingredient]["source_uncertainty_count"] += 1

        # Format directly observed list
        dir_list: List[RecurringIngredientItem] = [
            RecurringIngredientItem(
                ingredient_id=v["ingredient_id"],
                ingredient_name=k,
                is_derived=False,
                number_of_products_containing=len(v["products"]),
                purchase_events_count=v["purchase_events"],
                affected_members=list(v["affected_members"]),
                relevant_conflict_types=list(v["conflict_types"]),
                confidence=0.98,
                source_uncertainty=v["source_uncertainty_count"] > 0,
                source_uncertainty_count=v["source_uncertainty_count"],
            )
            for k, v in directly_observed_map.items()
        ]
        dir_list.sort(key=lambda x: x.purchase_events_count, reverse=True)

        # Format derived list
        der_list: List[RecurringIngredientItem] = [
            RecurringIngredientItem(
                ingredient_id=v["ingredient_id"],
                ingredient_name=k,
                is_derived=True,
                derivation_path=v.get("derivation_path"),
                number_of_products_containing=len(v["products"]),
                purchase_events_count=v["purchase_events"],
                affected_members=list(v["affected_members"]),
                relevant_conflict_types=list(v["conflict_types"]),
                confidence=v.get("confidence", 0.95),
                source_uncertainty=v["source_uncertainty_count"] > 0,
                source_uncertainty_count=v["source_uncertainty_count"],
            )
            for k, v in derived_map.items()
        ]
        der_list.sort(key=lambda x: x.purchase_events_count, reverse=True)

        return RecurringIngredientsResponse(
            family_id=family_id,
            total_ingredients_observed=len(dir_list) + len(der_list),
            directly_observed=dir_list[:30],  # top 30
            relationship_derived=der_list[:20],
        )

    # ---------------------------------------------------------
    # 4. Member Trend Analysis
    # ---------------------------------------------------------

    async def get_member_impact(
        self,
        db: AsyncSession,
        family_id: uuid.UUID,
        period: Optional[str] = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> MemberHistoryResponse:
        """Produces personalized historical purchase statistics for each family member."""
        await self.sync_family_history(db, family_id)
        start_dt, end_dt, _ = self.resolve_date_range(period, start_date, end_date)

        # Fetch family members
        stmt_mems = (
            select(FamilyMember)
            .where(FamilyMember.family_id == family_id)
            .order_by(FamilyMember.name.asc())
        )
        members = (await db.execute(stmt_mems)).scalars().all()

        # Query all MemberTrendEvents in period with Finding & Product
        mte_stmt = (
            select(MemberTrendEvent)
            .options(
                selectinload(MemberTrendEvent.product),
                selectinload(MemberTrendEvent.finding),
            )
            .where(MemberTrendEvent.family_id == family_id)
        )
        if start_dt:
            mte_stmt = mte_stmt.where(MemberTrendEvent.purchase_date >= start_dt)
        if end_dt:
            mte_stmt = mte_stmt.where(MemberTrendEvent.purchase_date <= end_dt)

        events = (await db.execute(mte_stmt)).scalars().all()

        events_by_member: Dict[uuid.UUID, List[MemberTrendEvent]] = {}
        for ev in events:
            if ev.member_id not in events_by_member:
                events_by_member[ev.member_id] = []
            events_by_member[ev.member_id].append(ev)

        result_members: List[MemberHistoryImpactItem] = []

        for mem in members:
            mem_evs = events_by_member.get(mem.id, [])

            total_analyzed = len(mem_evs)
            high_attention = sum(1 for e in mem_evs if e.status == "high_attention")
            potential_conflicts = sum(1 for e in mem_evs if e.status == "potential_conflict")
            verification_req = sum(1 for e in mem_evs if e.status == "verification_required")

            # Group recurring requirements
            allergens_map: Dict[str, Dict[str, Any]] = {}
            dietary_map: Dict[str, Dict[str, Any]] = {}
            exclusions_map: Dict[str, Dict[str, Any]] = {}
            uncertainty_map: Dict[str, Dict[str, Any]] = {}
            pref_map: Dict[str, Dict[str, Any]] = {}

            for e in mem_evs:
                f = e.finding
                prod_name = e.product.name if e.product else "Product"
                rule_name = f.matched_rule if (f and f.matched_rule) else (f.trigger_text if f else "Requirement")
                sample_id = str(e.finding_id) if e.finding_id else None

                if e.conflict_type in ["direct_allergen", "derived_allergen", "cross_contact"]:
                    if rule_name not in allergens_map:
                        allergens_map[rule_name] = {"count": 0, "products": set(), "sample_id": sample_id}
                    allergens_map[rule_name]["count"] += 1
                    allergens_map[rule_name]["products"].add(prod_name)

                elif e.conflict_type == "dietary_conflict":
                    if rule_name not in dietary_map:
                        dietary_map[rule_name] = {"count": 0, "products": set(), "sample_id": sample_id}
                    dietary_map[rule_name]["count"] += 1
                    dietary_map[rule_name]["products"].add(prod_name)

                elif e.conflict_type == "ingredient_exclusion":
                    if rule_name not in exclusions_map:
                        exclusions_map[rule_name] = {"count": 0, "products": set(), "sample_id": sample_id}
                    exclusions_map[rule_name]["count"] += 1
                    exclusions_map[rule_name]["products"].add(prod_name)

                elif e.conflict_type == "source_uncertainty" or e.status == "verification_required":
                    trigger = f.trigger_text if (f and f.trigger_text) else "Ambiguous Source"
                    if trigger not in uncertainty_map:
                        uncertainty_map[trigger] = {"count": 0, "products": set(), "sample_id": sample_id}
                    uncertainty_map[trigger]["count"] += 1
                    uncertainty_map[trigger]["products"].add(prod_name)

                elif e.conflict_type == "nutrition_preference":
                    if rule_name not in pref_map:
                        pref_map[rule_name] = {"count": 0, "products": set(), "sample_id": sample_id}
                    pref_map[rule_name]["count"] += 1
                    pref_map[rule_name]["products"].add(prod_name)

            rec_allergens = [
                MemberRequirementTrend(
                    requirement_name=k,
                    requirement_type="allergen",
                    occurrences=v["count"],
                    associated_products=list(v["products"]),
                    sample_finding_id=v["sample_id"],
                )
                for k, v in allergens_map.items()
            ]
            rec_dietary = [
                MemberRequirementTrend(
                    requirement_name=k,
                    requirement_type="dietary",
                    occurrences=v["count"],
                    associated_products=list(v["products"]),
                    sample_finding_id=v["sample_id"],
                )
                for k, v in dietary_map.items()
            ]
            rec_exclusions = [
                MemberRequirementTrend(
                    requirement_name=k,
                    requirement_type="exclusion",
                    occurrences=v["count"],
                    associated_products=list(v["products"]),
                    sample_finding_id=v["sample_id"],
                )
                for k, v in exclusions_map.items()
            ]
            rec_uncertainty = [
                MemberRequirementTrend(
                    requirement_name=k,
                    requirement_type="source_uncertainty",
                    occurrences=v["count"],
                    associated_products=list(v["products"]),
                    sample_finding_id=v["sample_id"],
                )
                for k, v in uncertainty_map.items()
            ]
            rec_prefs = [
                MemberRequirementTrend(
                    requirement_name=k,
                    requirement_type="nutrition_preference",
                    occurrences=v["count"],
                    associated_products=list(v["products"]),
                    sample_finding_id=v["sample_id"],
                )
                for k, v in pref_map.items()
            ]

            result_members.append(
                MemberHistoryImpactItem(
                    member_id=mem.id,
                    member_name=mem.name,
                    relationship=mem.relationship,
                    total_purchases_analyzed=total_analyzed,
                    products_requiring_attention=high_attention,
                    potential_conflicts=potential_conflicts,
                    verification_required_products=verification_req,
                    recurring_allergens=rec_allergens,
                    recurring_dietary_conflicts=rec_dietary,
                    recurring_ingredient_exclusions=rec_exclusions,
                    recurring_source_uncertainty=rec_uncertainty,
                    recurring_nutrition_preferences=rec_prefs,
                )
            )

        return MemberHistoryResponse(
            family_id=family_id,
            members=result_members,
        )

    # ---------------------------------------------------------
    # 5. Recurring Attention Patterns Engine
    # ---------------------------------------------------------

    async def get_recurring_patterns(
        self,
        db: AsyncSession,
        family_id: uuid.UUID,
        period: Optional[str] = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> RecurringFindingsResponse:
        """Deterministic rule engine detecting recurring grocery safety patterns:
        - Same product repeatedly purchased with matching family conflict
        - Multiple products sharing a derived allergen requirement
        - Multiple products sharing source uncertainties (e.g. INS 471)
        - Precautionary cross-contact statements recurring across purchases
        """
        await self.sync_family_history(db, family_id)
        start_dt, end_dt, _ = self.resolve_date_range(period, start_date, end_date)

        # Query all MemberTrendEvents in period
        mte_stmt = (
            select(MemberTrendEvent)
            .options(
                selectinload(MemberTrendEvent.member),
                selectinload(MemberTrendEvent.product),
                selectinload(MemberTrendEvent.finding).selectinload(RiskFinding.paths),
            )
            .where(
                MemberTrendEvent.family_id == family_id,
                MemberTrendEvent.status.in_(["high_attention", "potential_conflict", "verification_required"]),
            )
        )
        if start_dt:
            mte_stmt = mte_stmt.where(MemberTrendEvent.purchase_date >= start_dt)
        if end_dt:
            mte_stmt = mte_stmt.where(MemberTrendEvent.purchase_date <= end_dt)

        events = (await db.execute(mte_stmt)).scalars().all()

        patterns: List[RecurringPatternItem] = []

        # -----------------------------------------------------
        # Rule 1: Same product purchased >= 2 times with conflict
        # -----------------------------------------------------
        prod_conflict_groups: Dict[uuid.UUID, List[MemberTrendEvent]] = {}
        for e in events:
            if e.product_id not in prod_conflict_groups:
                prod_conflict_groups[e.product_id] = []
            prod_conflict_groups[e.product_id].append(e)

        for prod_id, ev_list in prod_conflict_groups.items():
            receipt_ids = set(e.receipt_id for e in ev_list)
            if len(receipt_ids) >= 2:
                first_ev = ev_list[0]
                prod_name = first_ev.product.name if first_ev.product else "Purchased Product"
                affected_members = list(set(e.member.name for e in ev_list if e.member))
                rule_names = list(set(e.finding.matched_rule for e in ev_list if (e.finding and e.finding.matched_rule)))

                rule_summary = f" ({', '.join(rule_names)})" if rule_names else ""
                patterns.append(
                    RecurringPatternItem(
                        pattern_type="recurring_product_conflict",
                        title=f"Recurring Conflict on '{prod_name}'",
                        description=(
                            f"'{prod_name}' was purchased across {len(receipt_ids)} separate receipts "
                            f"and repeatedly generated configured requirements{rule_summary}."
                        ),
                        supporting_purchase_count=len(ev_list),
                        supporting_product_count=1,
                        affected_members=affected_members,
                        supporting_receipt_ids=[str(r) for r in receipt_ids],
                        supporting_product_names=[prod_name],
                        confidence=0.98,
                        sample_finding_id=str(first_ev.finding_id) if first_ev.finding_id else None,
                        actionable_review=f"Review whether '{prod_name}' is suitable for the entire household or if a dedicated alternative is preferable.",
                    )
                )

        # -----------------------------------------------------
        # Rule 2: Shared derived allergen across multiple products
        # -----------------------------------------------------
        derived_allergen_groups: Dict[str, List[MemberTrendEvent]] = {}
        for e in events:
            if e.conflict_type in ["derived_allergen", "direct_allergen"]:
                key = e.finding.matched_rule if (e.finding and e.finding.matched_rule) else "Allergen"
                if key not in derived_allergen_groups:
                    derived_allergen_groups[key] = []
                derived_allergen_groups[key].append(e)

        for allergen_name, ev_list in derived_allergen_groups.items():
            prod_names = list(set(e.product.name for e in ev_list if e.product))
            receipt_ids = set(e.receipt_id for e in ev_list)
            if len(prod_names) >= 2 or len(receipt_ids) >= 2:
                affected_members = list(set(e.member.name for e in ev_list if e.member))
                first_ev = ev_list[0]
                patterns.append(
                    RecurringPatternItem(
                        pattern_type="recurring_derived_allergen",
                        title=f"Recurring {allergen_name} Findings Across Purchases",
                        description=(
                            f"Identified across {len(prod_names)} distinct products and {len(receipt_ids)} purchase records, "
                            f"affecting {', '.join(affected_members)}."
                        ),
                        supporting_purchase_count=len(ev_list),
                        supporting_product_count=len(prod_names),
                        affected_members=affected_members,
                        supporting_receipt_ids=[str(r) for r in receipt_ids],
                        supporting_product_names=prod_names,
                        confidence=0.96,
                        sample_finding_id=str(first_ev.finding_id) if first_ev.finding_id else None,
                        actionable_review=f"Inspect labels of packaged pantry staples for hidden or derived sources of {allergen_name}.",
                    )
                )

        # -----------------------------------------------------
        # Rule 3: Recurring source uncertainties (e.g. INS 471)
        # -----------------------------------------------------
        uncertainty_events = [e for e in events if e.conflict_type == "source_uncertainty" or e.status == "verification_required"]
        if uncertainty_events:
            receipt_ids = set(e.receipt_id for e in uncertainty_events)
            prod_names = list(set(e.product.name for e in uncertainty_events if e.product))
            first_ev = uncertainty_events[0]
            affected_members = list(set(e.member.name for e in uncertainty_events if e.member))
            patterns.append(
                RecurringPatternItem(
                    pattern_type="recurring_source_uncertainty",
                    title="Recurring Source Verification on Additives (INS 471 / Emulsifiers)",
                    description=(
                        f"Encountered in {len(prod_names)} purchased products across {len(receipt_ids)} receipts where "
                        f"botanical vs animal derivation is unspecified on standard catalog data."
                    ),
                    supporting_purchase_count=len(uncertainty_events),
                    supporting_product_count=len(prod_names),
                    affected_members=affected_members,
                    supporting_receipt_ids=[str(r) for r in receipt_ids],
                    supporting_product_names=prod_names,
                    confidence=0.90,
                    sample_finding_id=str(first_ev.finding_id) if first_ev.finding_id else None,
                    actionable_review="Verify physical product packaging for explicit 'Plant-derived' or vegetarian certification symbols.",
                )
            )

        # -----------------------------------------------------
        # Rule 4: Cross-contact precautionary statements
        # -----------------------------------------------------
        cross_contact_events = [e for e in events if e.conflict_type == "cross_contact"]
        if cross_contact_events:
            receipt_ids = set(e.receipt_id for e in cross_contact_events)
            prod_names = list(set(e.product.name for e in cross_contact_events if e.product))
            first_ev = cross_contact_events[0]
            affected_members = list(set(e.member.name for e in cross_contact_events if e.member))
            patterns.append(
                RecurringPatternItem(
                    pattern_type="recurring_cross_contact",
                    title="Precautionary Facility Statements Recurring in Purchases",
                    description=(
                        f"Observed on {len(prod_names)} purchased products across {len(receipt_ids)} receipts "
                        f"carrying advisory labels (e.g. 'May contain traces...')."
                    ),
                    supporting_purchase_count=len(cross_contact_events),
                    supporting_product_count=len(prod_names),
                    affected_members=affected_members,
                    supporting_receipt_ids=[str(r) for r in receipt_ids],
                    supporting_product_names=prod_names,
                    confidence=0.94,
                    sample_finding_id=str(first_ev.finding_id) if first_ev.finding_id else None,
                    actionable_review="Review household tolerance for shared facility / precautionary manufacturing statements.",
                )
            )

        return RecurringFindingsResponse(
            family_id=family_id,
            patterns=patterns,
        )

    # ---------------------------------------------------------
    # 6. Period-Over-Period Comparison
    # ---------------------------------------------------------

    async def get_period_comparison(
        self,
        db: AsyncSession,
        family_id: uuid.UUID,
        period: Optional[str] = "current_month",
    ) -> PeriodComparisonResponse:
        """Compares current period metrics against previous equivalent period metrics
        using strictly factual, neutral, observation-based statements.
        """
        await self.sync_family_history(db, family_id)
        now = datetime.now(timezone.utc)

        if period == "current_month":
            # Current: This month
            curr_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
            curr_end = now
            curr_name = now.strftime("%B %Y")

            # Prev: Previous month
            first_of_curr = curr_start
            last_of_prev = first_of_curr - timedelta(days=1)
            prev_start = datetime(last_of_prev.year, last_of_prev.month, 1, tzinfo=timezone.utc)
            prev_end = datetime(last_of_prev.year, last_of_prev.month, last_of_prev.day, 23, 59, 59, tzinfo=timezone.utc)
            prev_name = prev_start.strftime("%B %Y")
        elif period == "7d":
            curr_start = now - timedelta(days=7)
            curr_end = now
            curr_name = "Last 7 Days"

            prev_start = now - timedelta(days=14)
            prev_end = curr_start
            prev_name = "Previous 7 Days"
        else:
            # Default 30d
            curr_start = now - timedelta(days=30)
            curr_end = now
            curr_name = "Last 30 Days"

            prev_start = now - timedelta(days=60)
            prev_end = curr_start
            prev_name = "Previous 30 Days"

        # Query Current Period
        curr_stmt = select(HistoricalRiskSnapshot).where(
            HistoricalRiskSnapshot.family_id == family_id,
            HistoricalRiskSnapshot.purchase_date >= curr_start,
            HistoricalRiskSnapshot.purchase_date <= curr_end,
        )
        curr_snaps = (await db.execute(curr_stmt)).scalars().all()

        curr_pph = select(ProductPurchaseHistory).where(
            ProductPurchaseHistory.family_id == family_id,
            ProductPurchaseHistory.purchase_date >= curr_start,
            ProductPurchaseHistory.purchase_date <= curr_end,
        )
        curr_purchases = (await db.execute(curr_pph)).scalars().all()

        # Query Previous Period
        prev_stmt = select(HistoricalRiskSnapshot).where(
            HistoricalRiskSnapshot.family_id == family_id,
            HistoricalRiskSnapshot.purchase_date >= prev_start,
            HistoricalRiskSnapshot.purchase_date <= prev_end,
        )
        prev_snaps = (await db.execute(prev_stmt)).scalars().all()

        prev_pph = select(ProductPurchaseHistory).where(
            ProductPurchaseHistory.family_id == family_id,
            ProductPurchaseHistory.purchase_date >= prev_start,
            ProductPurchaseHistory.purchase_date <= prev_end,
        )
        prev_purchases = (await db.execute(prev_pph)).scalars().all()

        curr_metrics = PeriodMetrics(
            total_receipts=len(curr_snaps),
            total_purchased_products=sum(s.total_products for s in curr_snaps),
            total_spend=round(sum(float(p.total_price or 0.0) for p in curr_purchases), 2),
            high_attention_count=sum(s.high_attention_count for s in curr_snaps),
            potential_conflict_count=sum(s.potential_conflict_count for s in curr_snaps),
            verification_required_count=sum(s.verification_required_count for s in curr_snaps),
            matched_products=sum(s.matched_products for s in curr_snaps),
        )

        prev_metrics = PeriodMetrics(
            total_receipts=len(prev_snaps),
            total_purchased_products=sum(s.total_products for s in prev_snaps),
            total_spend=round(sum(float(p.total_price or 0.0) for p in prev_purchases), 2),
            high_attention_count=sum(s.high_attention_count for s in prev_snaps),
            potential_conflict_count=sum(s.potential_conflict_count for s in prev_snaps),
            verification_required_count=sum(s.verification_required_count for s in prev_snaps),
            matched_products=sum(s.matched_products for s in prev_snaps),
        )

        # Generate neutral, factual change statements
        changes: List[str] = []

        diff_rcpt = curr_metrics.total_receipts - prev_metrics.total_receipts
        if diff_rcpt > 0:
            changes.append(f"Analyzed receipts increased from {prev_metrics.total_receipts} to {curr_metrics.total_receipts}.")
        elif diff_rcpt < 0:
            changes.append(f"Analyzed receipts changed from {prev_metrics.total_receipts} to {curr_metrics.total_receipts}.")

        diff_matched = curr_metrics.matched_products - prev_metrics.matched_products
        if diff_matched != 0:
            changes.append(f"Matched purchase records changed from {prev_metrics.matched_products} to {curr_metrics.matched_products}.")

        diff_verif = curr_metrics.verification_required_count - prev_metrics.verification_required_count
        if diff_verif > 0:
            changes.append(f"Products requiring verification increased from {prev_metrics.verification_required_count} to {curr_metrics.verification_required_count}.")
        elif diff_verif < 0:
            changes.append(f"Products requiring verification decreased from {prev_metrics.verification_required_count} to {curr_metrics.verification_required_count}.")

        diff_conflict = curr_metrics.potential_conflict_count - prev_metrics.potential_conflict_count
        if diff_conflict != 0:
            changes.append(f"Potential conflict events shifted from {prev_metrics.potential_conflict_count} to {curr_metrics.potential_conflict_count}.")

        diff_attention = curr_metrics.high_attention_count - prev_metrics.high_attention_count
        if diff_attention != 0:
            changes.append(f"High-attention purchase findings recorded: {curr_metrics.high_attention_count} (was {prev_metrics.high_attention_count}).")

        if not changes:
            changes.append("No significant metric variations observed between the selected periods.")

        summary_text = (
            f"Comparison between {curr_name} and {prev_name} indicates {curr_metrics.total_receipts} receipt(s) "
            f"and {curr_metrics.matched_products} matched product(s) analyzed in the current period."
        )

        return PeriodComparisonResponse(
            family_id=family_id,
            current_period_name=curr_name,
            previous_period_name=prev_name,
            current_metrics=curr_metrics,
            previous_metrics=prev_metrics,
            changes=changes,
            summary=summary_text,
        )

    # ---------------------------------------------------------
    # 7. Coverage & Data Quality
    # ---------------------------------------------------------

    async def get_coverage(self, db: AsyncSession, family_id: uuid.UUID) -> HistoricalCoverageResponse:
        """Evaluates historical data quality, catalog matching coverage, and exposes gaps."""
        await self.sync_family_history(db, family_id)

        # Receipts
        rcpt_stmt = select(Receipt).where(Receipt.family_id == family_id)
        receipts = (await db.execute(rcpt_stmt)).scalars().all()

        total_rcpts = len(receipts)
        processed_rcpts = sum(1 for r in receipts if r.processing_status in ["completed", "analyzed"])

        # Receipt items
        item_stmt = (
            select(ReceiptItem)
            .join(Receipt, ReceiptItem.receipt_id == Receipt.id)
            .where(Receipt.family_id == family_id)
        )
        items = (await db.execute(item_stmt)).scalars().all()

        total_items = len(items)
        matched_items = sum(1 for it in items if it.product_id is not None)
        ambiguous_items = sum(1 for it in items if it.requires_selection)
        unresolved_items = sum(1 for it in items if it.product_id is None)

        # Products with ingredients
        prod_ids = list(set(it.product_id for it in items if it.product_id is not None))
        prods_with_ing = 0
        prods_missing_ing = 0

        if prod_ids:
            ing_stmt = select(ProductIngredient.product_id).where(ProductIngredient.product_id.in_(prod_ids)).distinct()
            prods_with_ing_ids = set((await db.execute(ing_stmt)).scalars().all())
            prods_with_ing = len(prods_with_ing_ids)
            prods_missing_ing = len(prod_ids) - prods_with_ing

        # Risk analyses available
        ra_stmt = select(RiskAnalysis).where(RiskAnalysis.family_id == family_id)
        ra_count = len((await db.execute(ra_stmt)).scalars().all())

        coverage_pct = round((matched_items / total_items * 100), 1) if total_items > 0 else 100.0

        if coverage_pct >= 85:
            grade = "High Coverage"
            warning = None
        elif coverage_pct >= 60:
            grade = "Moderate Coverage"
            warning = "Some purchased grocery items could not be matched to verified catalog products. These items remain unanalyzed."
        else:
            grade = "Action Needed"
            warning = "A significant portion of purchased items are unresolved. Please review receipt item matches to ensure complete family food intelligence."

        return HistoricalCoverageResponse(
            family_id=family_id,
            total_receipts_uploaded=total_rcpts,
            receipts_successfully_processed=processed_rcpts,
            total_line_items=total_items,
            matched_products=matched_items,
            ambiguous_products=ambiguous_items,
            unresolved_products=unresolved_items,
            products_with_ingredients=prods_with_ing,
            products_missing_ingredients=prods_missing_ing,
            risk_analyses_available=ra_count,
            coverage_percentage=coverage_pct,
            data_quality_grade=grade,
            warning_message=warning,
        )

    # ---------------------------------------------------------
    # 8. Monthly Family Report
    # ---------------------------------------------------------

    async def get_monthly_report(
        self,
        db: AsyncSession,
        family_id: uuid.UUID,
        year: Optional[int] = None,
        month: Optional[int] = None,
    ) -> MonthlyFamilyReportResponse:
        """Compiles a monthly family grocery intelligence report."""
        await self.sync_family_history(db, family_id)
        now = datetime.now(timezone.utc)
        target_year = year or now.year
        target_month = month or now.month

        start_dt = datetime(target_year, target_month, 1, tzinfo=timezone.utc)
        _, last_day = monthrange(target_year, target_month)
        end_dt = datetime(target_year, target_month, last_day, 23, 59, 59, tzinfo=timezone.utc)

        month_label = start_dt.strftime("%B %Y")

        summary = await self.get_summary(db, family_id, period="custom", start_date=start_dt, end_date=end_dt)
        patterns_resp = await self.get_recurring_patterns(db, family_id, period="custom", start_date=start_dt, end_date=end_dt)
        products_resp = await self.get_recurring_products(db, family_id, period="custom", start_date=start_dt, end_date=end_dt)

        top_patterns = [p.title for p in patterns_resp.patterns[:5]]
        top_prods = [
            {
                "product_name": p.product_name,
                "purchase_count": p.purchase_count,
                "total_spend": p.total_spend,
                "attention_events": p.high_attention_events,
            }
            for p in products_resp.recurring_products[:5]
        ]

        return MonthlyFamilyReportResponse(
            family_id=family_id,
            month_name=month_label,
            generated_at=now,
            receipts_analyzed=summary.total_receipts,
            purchased_products=summary.total_purchased_products,
            products_successfully_matched=summary.total_purchased_products - summary.unresolved_products_count,
            products_requiring_review=summary.unresolved_products_count,
            high_attention_count=summary.high_attention_count,
            potential_conflict_count=summary.potential_conflict_count,
            verification_required_count=summary.verification_required_count,
            top_recurring_patterns=top_patterns,
            most_recurring_products=top_prods,
        )

    # ---------------------------------------------------------
    # 9. Timeline & Combined History Overview
    # ---------------------------------------------------------

    async def get_history_overview(
        self,
        db: AsyncSession,
        family_id: uuid.UUID,
        period: Optional[str] = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> FamilyHistoryOverviewResponse:
        """Assembles a unified history dashboard payload with summary, coverage,
        recurring patterns, top products, and receipt timeline.
        """
        await self.sync_family_history(db, family_id)
        start_dt, end_dt, _ = self.resolve_date_range(period, start_date, end_date)

        summary = await self.get_summary(db, family_id, period, start_date, end_date)
        coverage = await self.get_coverage(db, family_id)
        patterns_resp = await self.get_recurring_patterns(db, family_id, period, start_date, end_date)
        products_resp = await self.get_recurring_products(db, family_id, period, start_date, end_date)

        # Build timeline from receipts & snapshots
        snap_stmt = (
            select(HistoricalRiskSnapshot)
            .options(selectinload(HistoricalRiskSnapshot.receipt))
            .where(HistoricalRiskSnapshot.family_id == family_id)
        )
        if start_dt:
            snap_stmt = snap_stmt.where(HistoricalRiskSnapshot.purchase_date >= start_dt)
        if end_dt:
            snap_stmt = snap_stmt.where(HistoricalRiskSnapshot.purchase_date <= end_dt)
        snap_stmt = snap_stmt.order_by(desc(HistoricalRiskSnapshot.purchase_date))

        snapshots = (await db.execute(snap_stmt)).scalars().all()

        timeline: List[TimelineEvent] = []
        for s in snapshots:
            rcpt = s.receipt
            total_amt = float(rcpt.total_amount) if (rcpt and rcpt.total_amount) else None
            curr = rcpt.currency if (rcpt and rcpt.currency) else "INR"

            timeline.append(
                TimelineEvent(
                    receipt_id=s.receipt_id,
                    risk_analysis_id=s.risk_analysis_id,
                    purchase_date=s.purchase_date,
                    merchant_name=None,
                    total_products=s.total_products,
                    matched_products=s.matched_products,
                    unresolved_products=s.unresolved_products,
                    high_attention_count=s.high_attention_count,
                    potential_conflict_count=s.potential_conflict_count,
                    verification_required_count=s.verification_required_count,
                    no_configured_conflict_count=s.no_configured_conflict_count,
                    total_amount=total_amt,
                    currency=curr,
                )
            )

        return FamilyHistoryOverviewResponse(
            summary=summary,
            coverage=coverage,
            recurring_patterns=patterns_resp.patterns,
            top_recurring_products=products_resp.recurring_products[:10],
            timeline=timeline,
        )


historical_grocery_service = HistoricalGroceryService()
