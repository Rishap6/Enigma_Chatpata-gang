import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.family import Family
from app.models.family_member import FamilyMember
from app.models.receipt import Receipt
from app.models.receipt_item import ReceiptItem
from app.models.product import Product
from app.models.risk_analysis import RiskAnalysis
from app.models.risk_finding import RiskFinding
from app.models.risk_finding_path import RiskFindingPath
from app.models.risk_finding_evidence import RiskFindingEvidence
from app.engines.product_analysis import analyze_product
from app.engines.risk_engine import evaluate_family_risk
from app.engines.risk_explanation import build_explainability_payload
from app.schemas.risk import (
    RiskAnalysisResponse,
    RiskAnalysisSummary,
    MemberRiskResponse,
    MemberRiskCounts,
    RiskFindingResponse,
    RiskFindingPathStep,
    RiskFindingEvidenceSchema,
    RiskExplainabilitySchema,
    FamilyRiskMatrixCell,
    ProductRiskResponse,
    ProductFamilyImpactItem,
)

logger = logging.getLogger(__name__)


class FamilyRiskService:
    """Manages family grocery risk analysis, execution, persistence, and queries."""

    async def analyze_receipt_risk(
        self,
        db: AsyncSession,
        receipt_id: uuid.UUID,
        owner_user_id: uuid.UUID,
        family_id: Optional[uuid.UUID] = None,
    ) -> RiskAnalysisResponse:
        """Executes full Family Risk Engine for a grocery receipt.
        Reuses Phase 2 ingredient intelligence & Phase 3 product analysis.
        Persists analysis version without mutating old runs.
        """
        # 1. Load Receipt
        stmt_rcpt = (
            select(Receipt)
            .options(selectinload(Receipt.items))
            .where(Receipt.id == receipt_id, Receipt.owner_user_id == owner_user_id)
        )
        receipt = (await db.execute(stmt_rcpt)).scalars().first()
        if not receipt:
            raise ValueError("Receipt not found or unauthorized access")

        effective_family_id = family_id or receipt.family_id
        if not effective_family_id:
            # Fallback: Find user's primary family
            stmt_fam = select(Family).where(Family.owner_user_id == owner_user_id)
            fam = (await db.execute(stmt_fam)).scalars().first()
            if not fam:
                raise ValueError("No family configured for this user. Please create a family profile first.")
            effective_family_id = fam.id

        # 2. Load Family and all Members with requirements in a single batched query
        stmt_family = (
            select(Family)
            .options(
                selectinload(Family.members).selectinload(FamilyMember.allergies),
                selectinload(Family.members).selectinload(FamilyMember.dietary_rules),
                selectinload(Family.members).selectinload(FamilyMember.ingredient_exclusions),
                selectinload(Family.members).selectinload(FamilyMember.nutrition_preferences),
                selectinload(Family.members).selectinload(FamilyMember.custom_rules),
            )
            .where(Family.id == effective_family_id, Family.owner_user_id == owner_user_id)
        )
        family = (await db.execute(stmt_family)).scalars().first()
        if not family:
            raise ValueError("Family not found or unauthorized access")

        members = family.members
        if not members:
            raise ValueError("Family has no members configured. Please add family members first.")

        # 3. Collect purchased products from receipt items
        # Deduplicate product analysis loading
        product_analysis_cache: Dict[uuid.UUID, Dict[str, Any]] = {}
        purchased_products: List[Dict[str, Any]] = []

        for item in receipt.items:
            if item.product_id:
                if item.product_id not in product_analysis_cache:
                    prod_analysis = await analyze_product(db, item.product_id)
                    if prod_analysis:
                        product_analysis_cache[item.product_id] = prod_analysis.model_dump()

                if item.product_id in product_analysis_cache:
                    purchased_products.append(product_analysis_cache[item.product_id])

        # If receipt items have no linked products yet, we cannot analyze ingredients
        if not purchased_products:
            raise ValueError("Receipt contains no matched catalog products to analyze. Please resolve receipt items first.")

        # 4. Check for previous analysis version to maintain clean versioning
        stmt_prev = (
            select(RiskAnalysis)
            .where(RiskAnalysis.receipt_id == receipt_id)
            .order_by(desc(RiskAnalysis.created_at))
        )
        prev_analysis = (await db.execute(stmt_prev)).scalars().first()
        if prev_analysis:
            # Parse version or increment
            try:
                cur_v = int(prev_analysis.analysis_version.replace("v", "").split(".")[0])
                new_version = f"v{cur_v + 1}.0.0"
            except Exception:
                new_version = f"v{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        else:
            new_version = "v1.0.0"

        # 5. Run the Family Risk Engine
        engine_result = evaluate_family_risk(
            family_id=family.id,
            members=members,
            purchased_products=purchased_products,
            receipt_id=receipt.id,
            analysis_version=new_version,
        )

        summary_data = engine_result["summary"]

        # 6. Persist RiskAnalysis record
        risk_analysis = RiskAnalysis(
            id=uuid.uuid4(),
            family_id=family.id,
            receipt_id=receipt.id,
            analysis_version=new_version,
            status="completed",
            products_analyzed=summary_data["products_analyzed"],
            members_analyzed=summary_data["members_analyzed"],
            high_attention_count=summary_data["high_priority"],
            potential_conflict_count=summary_data["potential_conflicts"],
            verification_count=summary_data["verification_required"],
            no_conflict_count=summary_data["no_configured_conflict"],
        )
        db.add(risk_analysis)
        await db.flush()

        # 7. Persist RiskFinding records, Paths, and Evidence
        saved_findings_by_id: Dict[str, RiskFinding] = {}

        for finding_data in engine_result["all_findings"]:
            rf_id = uuid.uuid4()
            rf = RiskFinding(
                id=rf_id,
                risk_analysis_id=risk_analysis.id,
                member_id=finding_data["member_id"],
                product_id=finding_data["product_id"],
                status=finding_data["status"],
                risk_type=finding_data["risk_type"],
                severity=finding_data.get("severity", "info"),
                title=finding_data["title"],
                summary=finding_data["summary"],
                trigger_text=finding_data.get("trigger_text"),
                matched_rule=finding_data.get("matched_rule"),
                reason=finding_data.get("reason"),
                confidence=finding_data.get("confidence"),
                attention_score=finding_data.get("attention_score", 0.0),
                requires_verification=finding_data.get("requires_verification", False),
                cross_contact=finding_data.get("cross_contact", False),
                source_uncertainty=finding_data.get("source_uncertainty", False),
            )
            db.add(rf)
            await db.flush()
            finding_data["id"] = rf_id
            finding_data["risk_analysis_id"] = risk_analysis.id

            # Save ingredient paths
            for step in finding_data.get("ingredient_path", []):
                rf_path = RiskFindingPath(
                    id=uuid.uuid4(),
                    finding_id=rf.id,
                    step_number=step.get("step_number", 1),
                    ingredient_id=step.get("ingredient_id"),
                    ingredient_name=step.get("ingredient_name", ""),
                    relationship_type=step.get("relationship_type"),
                )
                db.add(rf_path)

            # Save evidence records
            for ev in finding_data.get("evidence", []):
                rf_ev = RiskFindingEvidence(
                    id=uuid.uuid4(),
                    finding_id=rf.id,
                    evidence_id=ev.get("evidence_id"),
                    evidence_type=ev.get("evidence_type"),
                    description=ev.get("description"),
                    confidence=ev.get("confidence"),
                )
                db.add(rf_ev)

        await db.commit()

        # Phase 8: Automatically sync historical grocery intelligence snapshots
        try:
            from app.services.historical_grocery_service import historical_grocery_service
            await historical_grocery_service.sync_family_history(db, family.id)
        except Exception:
            pass

        # Phase 9: Downstream in-app notifications (no new risk analysis)
        try:
            from app.services.notification_service import NotificationService
            await NotificationService.generate_after_risk_pipeline(
                db,
                family.id,
                receipt.id,
                risk_analysis.id,
            )
        except Exception:
            logger.exception("Notification generation failed after risk analysis")

        # 8. Return formatted response
        return await self.get_risk_analysis(db, risk_analysis.id, owner_user_id)

    async def get_risk_analysis(
        self,
        db: AsyncSession,
        analysis_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> RiskAnalysisResponse:
        """Loads and formats a saved RiskAnalysis with all findings, members, and matrix."""
        stmt = (
            select(RiskAnalysis)
            .options(
                selectinload(RiskAnalysis.family).selectinload(Family.members),
                selectinload(RiskAnalysis.findings).selectinload(RiskFinding.paths),
                selectinload(RiskAnalysis.findings).selectinload(RiskFinding.evidence),
                selectinload(RiskAnalysis.findings).selectinload(RiskFinding.member),
                selectinload(RiskAnalysis.findings).selectinload(RiskFinding.product),
            )
            .where(RiskAnalysis.id == analysis_id)
        )
        analysis = (await db.execute(stmt)).scalars().first()
        if not analysis:
            raise ValueError("Risk analysis not found")

        # Security check: verify user owns family or receipt
        if analysis.family and analysis.family.owner_user_id != owner_user_id:
            raise ValueError("Unauthorized access to this risk analysis")

        return self._build_analysis_response(analysis)

    async def get_latest_receipt_risk(
        self,
        db: AsyncSession,
        receipt_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> Optional[RiskAnalysisResponse]:
        """Retrieves the latest completed risk analysis for a receipt."""
        stmt_rcpt = select(Receipt).where(Receipt.id == receipt_id, Receipt.owner_user_id == owner_user_id)
        receipt = (await db.execute(stmt_rcpt)).scalars().first()
        if not receipt:
            raise ValueError("Receipt not found or unauthorized access")

        stmt = (
            select(RiskAnalysis)
            .options(
                selectinload(RiskAnalysis.family).selectinload(Family.members),
                selectinload(RiskAnalysis.findings).selectinload(RiskFinding.paths),
                selectinload(RiskAnalysis.findings).selectinload(RiskFinding.evidence),
                selectinload(RiskAnalysis.findings).selectinload(RiskFinding.member),
                selectinload(RiskAnalysis.findings).selectinload(RiskFinding.product),
            )
            .where(RiskAnalysis.receipt_id == receipt_id)
            .order_by(desc(RiskAnalysis.created_at))
        )
        analysis = (await db.execute(stmt)).scalars().first()
        if not analysis:
            return None

        return self._build_analysis_response(analysis)

    async def get_receipt_member_risk(
        self,
        db: AsyncSession,
        receipt_id: uuid.UUID,
        member_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> MemberRiskResponse:
        """Returns product risk findings for a single family member on a receipt."""
        latest_analysis = await self.get_latest_receipt_risk(db, receipt_id, owner_user_id)
        if not latest_analysis:
            raise ValueError("No risk analysis available for this receipt")

        for m_resp in latest_analysis.members:
            if m_resp.member_id == member_id:
                return m_resp

        raise ValueError("Family member not found in this risk analysis")

    async def get_receipt_product_risk(
        self,
        db: AsyncSession,
        receipt_id: uuid.UUID,
        product_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> ProductRiskResponse:
        """Returns all family members affected by a specific purchased product."""
        latest_analysis = await self.get_latest_receipt_risk(db, receipt_id, owner_user_id)
        if not latest_analysis:
            raise ValueError("No risk analysis available for this receipt")

        # Find product name
        prod_stmt = select(Product).where(Product.id == product_id)
        product = (await db.execute(prod_stmt)).scalars().first()
        p_name = product.name if product else "Product"

        impacted_members: List[ProductFamilyImpactItem] = []

        for m_resp in latest_analysis.members:
            matching_findings = [f for f in m_resp.product_results if f.product_id == product_id]
            if matching_findings:
                top_f = matching_findings[0]
                overall_status = top_f.status
                impacted_members.append(
                    ProductFamilyImpactItem(
                        member_id=m_resp.member_id,
                        member_name=m_resp.member_name,
                        status=overall_status,
                        top_finding=top_f,
                        findings=matching_findings,
                    )
                )

        return ProductRiskResponse(
            product_id=product_id,
            product_name=p_name,
            receipt_id=receipt_id,
            impacted_members=impacted_members,
        )

    async def get_finding_explanation(
        self,
        db: AsyncSession,
        finding_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> RiskExplainabilitySchema:
        """Loads a specific finding with full path ancestry, evidence, and returns Phase 7 explainability."""
        stmt = (
            select(RiskFinding)
            .options(
                selectinload(RiskFinding.paths),
                selectinload(RiskFinding.evidence),
                selectinload(RiskFinding.member),
                selectinload(RiskFinding.product),
                selectinload(RiskFinding.risk_analysis).selectinload(RiskAnalysis.family),
            )
            .where(RiskFinding.id == finding_id)
        )
        finding = (await db.execute(stmt)).scalars().first()
        if not finding:
            raise ValueError("Risk finding not found")

        # Security check: verify user owns family
        if (
            finding.risk_analysis
            and finding.risk_analysis.family
            and finding.risk_analysis.family.owner_user_id != owner_user_id
        ):
            raise ValueError("Unauthorized access to this finding explanation")

        m_name = finding.member.name if finding.member else "Member"
        p_name = finding.product.name if finding.product else "Product"

        path_steps = [
            RiskFindingPathStep(
                step_number=p.step_number,
                ingredient_name=p.ingredient_name,
                relationship_type=p.relationship_type,
                ingredient_id=p.ingredient_id,
            )
            for p in sorted(finding.paths, key=lambda x: x.step_number)
        ]

        evidence_items = [
            RiskFindingEvidenceSchema(
                evidence_type=e.evidence_type,
                description=e.description,
                confidence=float(e.confidence) if e.confidence is not None else None,
                evidence_id=e.evidence_id,
            )
            for e in finding.evidence
        ]

        f_dict = {
            "id": finding.id,
            "member_id": finding.member_id,
            "member_name": m_name,
            "product_id": finding.product_id,
            "product_name": p_name,
            "title": finding.title,
            "summary": finding.summary,
            "trigger_text": finding.trigger_text,
            "matched_rule": finding.matched_rule,
            "risk_type": finding.risk_type,
            "status": finding.status,
            "severity": finding.severity,
            "confidence": float(finding.confidence) if finding.confidence is not None else 0.95,
            "attention_score": float(finding.attention_score),
            "requires_verification": finding.requires_verification,
            "cross_contact": finding.cross_contact,
            "source_uncertainty": finding.source_uncertainty,
            "reason": finding.reason,
            "ingredient_path": [p.model_dump() for p in path_steps],
            "evidence": [e.model_dump() for e in evidence_items],
        }

        expl_payload = build_explainability_payload(f_dict)
        return RiskExplainabilitySchema(**expl_payload)

    def _build_analysis_response(self, analysis: RiskAnalysis) -> RiskAnalysisResponse:
        """Helper to build strongly typed RiskAnalysisResponse from ORM model."""
        findings_by_member: Dict[uuid.UUID, List[RiskFindingResponse]] = {}
        findings_by_product_member: Dict[tuple, List[RiskFindingResponse]] = {}
        all_products_map: Dict[uuid.UUID, str] = {}

        for f in analysis.findings:
            mem_id = f.member_id
            m_name = f.member.name if f.member else "Member"
            p_name = f.product.name if f.product else "Product"
            all_products_map[f.product_id] = p_name

            path_steps = [
                RiskFindingPathStep(
                    step_number=p.step_number,
                    ingredient_name=p.ingredient_name,
                    relationship_type=p.relationship_type,
                    ingredient_id=p.ingredient_id,
                )
                for p in sorted(f.paths, key=lambda x: x.step_number)
            ]

            evidence_items = [
                RiskFindingEvidenceSchema(
                    evidence_type=e.evidence_type,
                    description=e.description,
                    confidence=float(e.confidence) if e.confidence is not None else None,
                    evidence_id=e.evidence_id,
                )
                for e in f.evidence
            ]

            f_dict = {
                "id": f.id,
                "member_id": f.member_id,
                "member_name": m_name,
                "product_id": f.product_id,
                "product_name": p_name,
                "title": f.title,
                "summary": f.summary,
                "trigger_text": f.trigger_text,
                "matched_rule": f.matched_rule,
                "risk_type": f.risk_type,
                "status": f.status,
                "severity": f.severity,
                "confidence": float(f.confidence) if f.confidence is not None else 0.95,
                "attention_score": float(f.attention_score),
                "requires_verification": f.requires_verification,
                "cross_contact": f.cross_contact,
                "source_uncertainty": f.source_uncertainty,
                "reason": f.reason,
                "ingredient_path": [p.model_dump() for p in path_steps],
                "evidence": [e.model_dump() for e in evidence_items],
            }
            expl = build_explainability_payload(f_dict)

            f_resp = RiskFindingResponse(
                id=f.id,
                risk_analysis_id=f.risk_analysis_id,
                member_id=f.member_id,
                member_name=m_name,
                product_id=f.product_id,
                product_name=p_name,
                status=f.status,
                risk_type=f.risk_type,
                severity=f.severity,
                title=f.title,
                summary=f.summary,
                trigger_text=f.trigger_text,
                matched_rule=f.matched_rule,
                reason=f.reason,
                confidence=float(f.confidence) if f.confidence is not None else None,
                attention_score=float(f.attention_score),
                requires_verification=f.requires_verification,
                cross_contact=f.cross_contact,
                source_uncertainty=f.source_uncertainty,
                ingredient_path=path_steps,
                evidence=evidence_items,
                explainability=expl,
                created_at=f.created_at,
            )

            if mem_id not in findings_by_member:
                findings_by_member[mem_id] = []
            findings_by_member[mem_id].append(f_resp)

            pm_key = (f.member_id, f.product_id)
            if pm_key not in findings_by_product_member:
                findings_by_product_member[pm_key] = []
            findings_by_product_member[pm_key].append(f_resp)

        # Build Member responses
        member_responses: List[MemberRiskResponse] = []
        family_members = analysis.family.members if (analysis.family and analysis.family.members) else []

        for m in family_members:
            m_findings = findings_by_member.get(m.id, [])
            m_high = len([x for x in m_findings if x.status == "high_attention"])
            m_potential = len([x for x in m_findings if x.status == "potential_conflict"])
            m_verif = len([x for x in m_findings if x.status == "verification_required"])
            m_no_conflict = len([x for x in m_findings if x.status == "no_configured_conflict"])

            member_responses.append(
                MemberRiskResponse(
                    member_id=m.id,
                    member_name=m.name,
                    summary=MemberRiskCounts(
                        high=m_high,
                        potential=m_potential,
                        verification=m_verif,
                        no_conflict=m_no_conflict,
                    ),
                    product_results=m_findings,
                )
            )

        # Build Matrix Cells
        matrix_cells: List[FamilyRiskMatrixCell] = []
        for m in family_members:
            for p_id, p_name in all_products_map.items():
                pm_key = (m.id, p_id)
                cell_findings = findings_by_product_member.get(pm_key, [])
                if cell_findings:
                    top_f = cell_findings[0]
                    c_status = top_f.status
                    non_zero = len([x for x in cell_findings if x.status != "no_configured_conflict"])
                    matrix_cells.append(
                        FamilyRiskMatrixCell(
                            member_id=m.id,
                            member_name=m.name,
                            product_id=p_id,
                            product_name=p_name,
                            status=c_status,
                            findings_count=non_zero,
                            top_finding_title=top_f.title,
                            top_risk_type=top_f.risk_type,
                            attention_score=top_f.attention_score,
                            findings=cell_findings,
                        )
                    )

        summary_resp = RiskAnalysisSummary(
            products_analyzed=analysis.products_analyzed,
            members_analyzed=analysis.members_analyzed,
            members_with_conflicts=len([m for m in member_responses if m.summary.high > 0 or m.summary.potential > 0]),
            high_priority=analysis.high_attention_count,
            potential_conflicts=analysis.potential_conflict_count,
            verification_required=analysis.verification_count,
            no_configured_conflict=analysis.no_conflict_count,
        )

        return RiskAnalysisResponse(
            id=analysis.id,
            family_id=analysis.family_id,
            receipt_id=analysis.receipt_id,
            analysis_version=analysis.analysis_version,
            status=analysis.status,
            analysis_timestamp=analysis.created_at,
            summary=summary_resp,
            members=member_responses,
            matrix=matrix_cells,
            created_at=analysis.created_at,
        )


family_risk_service = FamilyRiskService()
