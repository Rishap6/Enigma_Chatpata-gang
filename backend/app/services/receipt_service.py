import json
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.receipt import Receipt
from app.models.receipt_item import ReceiptItem
from app.models.receipt_processing_event import ReceiptProcessingEvent
from app.models.product import Product
from app.models.family import Family
from app.services.receipt_image_service import receipt_image_service
from app.services.receipt_ocr_service import receipt_ocr_service
from app.engines.receipt_parser import parse_receipt_text
from app.engines.product_normalization import normalize_product_name
from app.engines.product_matching import match_product, _build_product_summary, _build_product_detail
from app.engines.product_analysis import analyze_product
from app.services.product_provider import product_provider
from app.schemas.receipt import (
    ReceiptResponse,
    ReceiptItemResponse,
    ReceiptProcessingEventResponse,
    ReceiptListResponse,
    ReceiptCoverageSummary,
    PurchasedProductItem,
    ReceiptAnalysisResponse,
)


class ReceiptService:
    """Orchestrates grocery receipt upload, preprocessing, OCR, parsing,
    product matching, manual resolution, and Phase 6 purchase dataset generation.
    """

    async def create_receipt(
        self,
        db: AsyncSession,
        owner_user_id: uuid.UUID,
        family_id: Optional[uuid.UUID],
        file_bytes: bytes,
        filename: Optional[str] = None,
    ) -> Receipt:
        """Uploads and creates an initial receipt record."""
        # 1. Compute hash for duplicate checking
        img_hash = receipt_image_service.compute_hash(file_bytes)

        # 2. Check family ownership if family_id is supplied
        if family_id:
            stmt = select(Family).where(
                and_(Family.id == family_id, Family.owner_user_id == owner_user_id)
            )
            family = (await db.execute(stmt)).scalars().first()
            if not family:
                family_id = None

        receipt_id = uuid.uuid4()
        storage_path, saved_filename = receipt_image_service.save_image(
            file_bytes, filename=filename, receipt_id=receipt_id
        )

        receipt = Receipt(
            id=receipt_id,
            owner_user_id=owner_user_id,
            family_id=family_id,
            original_filename=filename,
            storage_path=storage_path,
            image_url=f"/api/receipts/{receipt_id}/image",
            processing_status="uploaded",
            image_hash=img_hash,
        )
        db.add(receipt)

        # Log upload event
        event = ReceiptProcessingEvent(
            receipt_id=receipt_id,
            stage="upload",
            status="completed",
            message=f"Receipt uploaded successfully ({len(file_bytes)} bytes)",
        )
        db.add(event)

        await db.commit()
        await db.refresh(receipt)
        return receipt

    async def process_receipt(
        self,
        db: AsyncSession,
        receipt_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> Receipt:
        """Executes full OCR, parsing, product normalization, and Phase 3 matching pipeline."""
        # Load receipt with security check
        stmt = (
            select(Receipt)
            .where(and_(Receipt.id == receipt_id, Receipt.owner_user_id == owner_user_id))
            .options(
                selectinload(Receipt.items),
                selectinload(Receipt.events),
            )
        )
        receipt = (await db.execute(stmt)).scalars().first()
        if not receipt:
            raise ValueError("Receipt not found or unauthorized access")

        receipt.processing_status = "processing"
        await db.commit()

        start_total = time.time()

        try:
            # ----------------------------------------------------
            # Stage 1: Image Preprocessing
            # ----------------------------------------------------
            t0 = time.time()
            target_image = receipt.storage_path or ""
            prep_res = receipt_image_service.preprocess_for_ocr(target_image)
            preprocessed_path = prep_res.get("preprocessed_path", target_image)
            t_prep = int((time.time() - t0) * 1000)

            db.add(
                ReceiptProcessingEvent(
                    receipt_id=receipt.id,
                    stage="preprocess",
                    status="completed" if prep_res.get("success", True) else "skipped",
                    message="Image contrast, sharpening, and grayscale normalization applied",
                    duration_ms=t_prep,
                )
            )

            # ----------------------------------------------------
            # Stage 2: OCR Text Extraction
            # ----------------------------------------------------
            t0 = time.time()
            ocr_res = await receipt_ocr_service.extract_text(preprocessed_path)
            t_ocr = int((time.time() - t0) * 1000)

            raw_text = ocr_res.get("text", "")
            ocr_conf = float(ocr_res.get("confidence", 0.85))

            receipt.ocr_text = raw_text
            receipt.ocr_confidence = ocr_conf

            db.add(
                ReceiptProcessingEvent(
                    receipt_id=receipt.id,
                    stage="ocr",
                    status="completed" if raw_text else "failed",
                    message=f"OCR extracted {len(raw_text)} chars with {int(ocr_conf * 100)}% confidence ({ocr_res.get('engine', 'auto')})",
                    duration_ms=t_ocr,
                )
            )

            if not raw_text.strip():
                receipt.processing_status = "failed"
                await db.commit()
                return receipt

            # ----------------------------------------------------
            # Stage 3: Receipt Line Parsing
            # ----------------------------------------------------
            t0 = time.time()
            parsed = parse_receipt_text(raw_text)
            t_parse = int((time.time() - t0) * 1000)

            parsed_items = parsed.get("items", [])
            meta = parsed.get("metadata", {})

            # Update monetary totals and purchase date if recognized
            if meta.get("purchase_date"):
                try:
                    receipt.purchase_date = datetime.fromisoformat(meta["purchase_date"])
                except Exception:
                    pass

            if meta.get("subtotal") is not None:
                receipt.subtotal = meta["subtotal"]
            if meta.get("tax") is not None:
                receipt.tax = meta["tax"]
            if meta.get("grand_total") is not None:
                receipt.total_amount = meta["grand_total"]

            db.add(
                ReceiptProcessingEvent(
                    receipt_id=receipt.id,
                    stage="parse",
                    status="completed",
                    message=f"Segmented {meta.get('total_lines_read', 0)} lines into {len(parsed_items)} candidate product items",
                    duration_ms=t_parse,
                )
            )

            # Remove previous non-user-corrected items for idempotency
            # But preserve user corrections if any exist
            existing_items_map = {item.line_number: item for item in receipt.items}

            # ----------------------------------------------------
            # Stage 4 & 5: Normalization & Phase 3 Matching
            # ----------------------------------------------------
            t0 = time.time()
            new_items: List[ReceiptItem] = []

            for p_item in parsed_items:
                line_no = p_item["line_number"]
                existing_item = existing_items_map.get(line_no)

                # If user already corrected this item, preserve it
                if existing_item and existing_item.user_corrected:
                    continue

                raw_line = p_item["raw_text"]
                raw_prod = p_item["product_name_raw"]

                # 4. Normalization
                norm_info = normalize_product_name(raw_prod)
                normalized_name = norm_info["normalized_name"]

                # 5. Phase 3 Matching
                match_res = await match_product(db, name=raw_prod)

                matched_prod_id = None
                match_method = None
                match_conf = match_res.confidence
                requires_selection = False
                requires_verification = False
                candidate_ids_json = None

                if match_res.matched and match_res.product:
                    # High confidence match (>= 0.85)
                    matched_prod_id = match_res.product.id
                    match_method = match_res.match_method or "exact_normalized"
                    requires_selection = False
                    requires_verification = False
                elif match_res.requires_selection and match_res.candidates:
                    # Ambiguous match (0.60 <= score < 0.85)
                    matched_prod_id = None
                    match_method = "ambiguous_candidates"
                    requires_selection = True
                    requires_verification = False
                    cand_ids = [str(c.product.id) for c in match_res.candidates]
                    candidate_ids_json = json.dumps(cand_ids)
                else:
                    # Unknown item (< 0.60)
                    matched_prod_id = None
                    match_method = None
                    requires_selection = False
                    requires_verification = True

                if existing_item:
                    # Update existing record
                    existing_item.raw_text = raw_line
                    existing_item.product_name_raw = raw_prod
                    existing_item.product_name_normalized = normalized_name
                    existing_item.quantity = p_item.get("quantity", 1.0)
                    existing_item.unit_price = p_item.get("unit_price")
                    existing_item.total_price = p_item.get("total_price")
                    existing_item.product_id = matched_prod_id
                    existing_item.match_method = match_method
                    existing_item.match_confidence = match_conf
                    existing_item.requires_selection = requires_selection
                    existing_item.requires_verification = requires_verification
                    existing_item.candidate_product_ids = candidate_ids_json
                else:
                    # Create new item
                    item_model = ReceiptItem(
                        receipt_id=receipt.id,
                        line_number=line_no,
                        raw_text=raw_line,
                        product_name_raw=raw_prod,
                        product_name_normalized=normalized_name,
                        quantity=p_item.get("quantity", 1.0),
                        unit_price=p_item.get("unit_price"),
                        total_price=p_item.get("total_price"),
                        currency="INR",
                        product_id=matched_prod_id,
                        match_method=match_method,
                        match_confidence=match_conf,
                        requires_selection=requires_selection,
                        requires_verification=requires_verification,
                        candidate_product_ids=candidate_ids_json,
                    )
                    db.add(item_model)

            t_match = int((time.time() - t0) * 1000)

            db.add(
                ReceiptProcessingEvent(
                    receipt_id=receipt.id,
                    stage="match",
                    status="completed",
                    message="Evaluated items against Phase 3 product catalog with fuzzy & brand matching",
                    duration_ms=t_match,
                )
            )

            # ----------------------------------------------------
            # Stage 6: Final Status Completion
            # ----------------------------------------------------
            await db.flush()

            # Refresh items to count resolution states
            stmt_items = select(ReceiptItem).where(ReceiptItem.receipt_id == receipt.id)
            current_items = (await db.execute(stmt_items)).scalars().all()

            unresolved_count = sum(
                1 for i in current_items if i.requires_selection or (i.requires_verification and not i.product_id)
            )

            if not current_items:
                receipt.processing_status = "failed"
            elif unresolved_count == 0:
                receipt.processing_status = "processed"
            else:
                receipt.processing_status = "partial"

            total_ms = int((time.time() - start_total) * 1000)
            db.add(
                ReceiptProcessingEvent(
                    receipt_id=receipt.id,
                    stage="complete",
                    status="completed",
                    message=f"Receipt pipeline finished with status '{receipt.processing_status}' ({len(current_items)} total items, {unresolved_count} requiring review)",
                    duration_ms=total_ms,
                )
            )

            await db.commit()
            await db.refresh(receipt)
            return receipt

        except Exception as e:
            receipt.processing_status = "failed"
            db.add(
                ReceiptProcessingEvent(
                    receipt_id=receipt.id,
                    stage="complete",
                    status="failed",
                    message=f"Receipt processing error: {str(e)}",
                    duration_ms=int((time.time() - start_total) * 1000),
                )
            )
            await db.commit()
            raise

    async def get_receipt(
        self,
        db: AsyncSession,
        receipt_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> Optional[ReceiptResponse]:
        """Loads receipt with security check, items, candidate products, and coverage stats."""
        stmt = (
            select(Receipt)
            .where(and_(Receipt.id == receipt_id, Receipt.owner_user_id == owner_user_id))
            .options(
                selectinload(Receipt.items).selectinload(ReceiptItem.product).selectinload(Product.brand),
                selectinload(Receipt.items).selectinload(ReceiptItem.product).selectinload(Product.category),
                selectinload(Receipt.items).selectinload(ReceiptItem.product).selectinload(Product.product_ingredients),
                selectinload(Receipt.events),
            )
        )
        receipt = (await db.execute(stmt)).scalars().first()
        if not receipt:
            return None

        return await self._build_receipt_response(db, receipt)

    async def list_receipts(
        self,
        db: AsyncSession,
        owner_user_id: uuid.UUID,
        family_id: Optional[uuid.UUID] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> ReceiptListResponse:
        """Returns paginated receipts for the authenticated user."""
        conditions = [Receipt.owner_user_id == owner_user_id]
        if family_id:
            conditions.append(Receipt.family_id == family_id)

        # Count total
        count_stmt = select(func.count(Receipt.id)).where(and_(*conditions))
        total = (await db.execute(count_stmt)).scalar() or 0

        # Query paginated
        offset = (page - 1) * page_size
        stmt = (
            select(Receipt)
            .where(and_(*conditions))
            .order_by(Receipt.created_at.desc())
            .offset(offset)
            .limit(page_size)
            .options(
                selectinload(Receipt.items).selectinload(ReceiptItem.product),
                selectinload(Receipt.events),
            )
        )
        receipts = (await db.execute(stmt)).scalars().all()

        responses = [await self._build_receipt_response(db, r) for r in receipts]
        pages = max(1, (total + page_size - 1) // page_size)

        return ReceiptListResponse(
            items=responses,
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        )

    async def resolve_receipt_item_product(
        self,
        db: AsyncSession,
        item_id: uuid.UUID,
        product_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> ReceiptItemResponse:
        """Assigns an identified product to an ambiguous or unknown receipt item."""
        stmt = (
            select(ReceiptItem)
            .join(Receipt)
            .where(and_(ReceiptItem.id == item_id, Receipt.owner_user_id == owner_user_id))
            .options(selectinload(ReceiptItem.receipt))
        )
        item = (await db.execute(stmt)).scalars().first()
        if not item:
            raise ValueError("Receipt item not found or unauthorized access")

        # Verify product exists in catalog
        prod_stmt = (
            select(Product)
            .where(Product.id == product_id)
            .options(selectinload(Product.brand), selectinload(Product.category))
        )
        prod = (await db.execute(prod_stmt)).scalars().first()
        if not prod:
            raise ValueError(f"Product '{product_id}' not found in catalog")

        item.product_id = prod.id
        item.user_corrected = True
        item.requires_selection = False
        item.requires_verification = False
        item.match_method = "user_selected"
        item.match_confidence = 1.0

        await self._recalculate_receipt_status(db, item.receipt_id)

        await db.commit()
        await db.refresh(item)

        # Build response
        item_resp = ReceiptItemResponse.model_validate(item)
        item_resp.product = await product_provider.get_product(db, prod.id)
        return item_resp

    async def resolve_receipt_item_barcode(
        self,
        db: AsyncSession,
        item_id: uuid.UUID,
        identifier_type: str,
        identifier_value: str,
        owner_user_id: uuid.UUID,
    ) -> ReceiptItemResponse:
        """Resolves an unresolved item using barcode scan lookup (integrating Phase 4)."""
        stmt = (
            select(ReceiptItem)
            .join(Receipt)
            .where(and_(ReceiptItem.id == item_id, Receipt.owner_user_id == owner_user_id))
        )
        item = (await db.execute(stmt)).scalars().first()
        if not item:
            raise ValueError("Receipt item not found or unauthorized access")

        # Call Phase 3/4 identifier lookup
        prod = await product_provider.find_by_identifier(
            db, identifier_type=identifier_type, identifier_value=identifier_value
        )
        if not prod:
            raise ValueError(f"No catalog product found for barcode '{identifier_value}'")

        item.product_id = prod.id
        item.user_corrected = True
        item.requires_selection = False
        item.requires_verification = False
        item.match_method = "barcode_scan"
        item.match_confidence = 1.0

        await self._recalculate_receipt_status(db, item.receipt_id)

        await db.commit()
        await db.refresh(item)

        item_resp = ReceiptItemResponse.model_validate(item)
        item_resp.product = prod
        return item_resp

    async def update_receipt_item(
        self,
        db: AsyncSession,
        item_id: uuid.UUID,
        owner_user_id: uuid.UUID,
        product_name_raw: Optional[str] = None,
        quantity: Optional[float] = None,
        unit_price: Optional[float] = None,
        total_price: Optional[float] = None,
    ) -> ReceiptItemResponse:
        """Updates text, quantity, or price on a receipt item."""
        stmt = (
            select(ReceiptItem)
            .join(Receipt)
            .where(and_(ReceiptItem.id == item_id, Receipt.owner_user_id == owner_user_id))
            .options(selectinload(ReceiptItem.product))
        )
        item = (await db.execute(stmt)).scalars().first()
        if not item:
            raise ValueError("Receipt item not found or unauthorized access")

        if product_name_raw is not None:
            item.product_name_raw = product_name_raw
            item.product_name_normalized = normalize_product_name(product_name_raw)["normalized_name"]
            item.user_corrected = True
            # Re-run matching on new name if not explicitly pinned
            match_res = await match_product(db, name=product_name_raw)
            if match_res.matched and match_res.product:
                item.product_id = match_res.product.id
                item.match_method = "user_corrected_match"
                item.match_confidence = match_res.confidence
                item.requires_selection = False
                item.requires_verification = False

        if quantity is not None:
            item.quantity = quantity
        if unit_price is not None:
            item.unit_price = unit_price
        if total_price is not None:
            item.total_price = total_price
        elif quantity is not None and unit_price is not None:
            item.total_price = round(quantity * unit_price, 2)

        await self._recalculate_receipt_status(db, item.receipt_id)

        await db.commit()
        await db.refresh(item)
        return ReceiptItemResponse.model_validate(item)

    async def delete_receipt_item(
        self,
        db: AsyncSession,
        item_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> bool:
        """Deletes an erroneous OCR line from the receipt."""
        stmt = (
            select(ReceiptItem)
            .join(Receipt)
            .where(and_(ReceiptItem.id == item_id, Receipt.owner_user_id == owner_user_id))
        )
        item = (await db.execute(stmt)).scalars().first()
        if not item:
            raise ValueError("Receipt item not found or unauthorized access")

        receipt_id = item.receipt_id
        await db.delete(item)
        await self._recalculate_receipt_status(db, receipt_id)
        await db.commit()
        return True

    async def add_manual_item(
        self,
        db: AsyncSession,
        receipt_id: uuid.UUID,
        owner_user_id: uuid.UUID,
        product_name: str,
        quantity: float = 1.0,
        price: Optional[float] = None,
    ) -> ReceiptItemResponse:
        """Adds a grocery line item manually and matches it against catalog."""
        stmt = (
            select(Receipt)
            .where(and_(Receipt.id == receipt_id, Receipt.owner_user_id == owner_user_id))
            .options(selectinload(Receipt.items))
        )
        receipt = (await db.execute(stmt)).scalars().first()
        if not receipt:
            raise ValueError("Receipt not found or unauthorized access")

        max_line = max([it.line_number for it in receipt.items], default=0) + 1
        norm_name = normalize_product_name(product_name)["normalized_name"]

        # Run Phase 3 matching
        match_res = await match_product(db, name=product_name)
        matched_id = match_res.product.id if (match_res.matched and match_res.product) else None
        requires_sel = match_res.requires_selection and bool(match_res.candidates)

        cand_ids = (
            json.dumps([str(c.product.id) for c in match_res.candidates])
            if requires_sel
            else None
        )

        item = ReceiptItem(
            receipt_id=receipt.id,
            line_number=max_line,
            raw_text=f"{product_name} {price or ''}".strip(),
            product_name_raw=product_name,
            product_name_normalized=norm_name,
            quantity=quantity,
            unit_price=price,
            total_price=round(quantity * price, 2) if price else None,
            currency="INR",
            product_id=matched_id,
            match_method=match_res.match_method if matched_id else None,
            match_confidence=match_res.confidence,
            requires_selection=requires_sel,
            requires_verification=(not matched_id and not requires_sel),
            user_corrected=True,
            candidate_product_ids=cand_ids,
        )
        db.add(item)
        await db.flush()

        await self._recalculate_receipt_status(db, receipt.id)
        await db.commit()
        await db.refresh(item)

        item_resp = ReceiptItemResponse.model_validate(item)
        if match_res.matched and match_res.product:
            item_resp.product = match_res.product
        return item_resp

    async def get_receipt_analysis(
        self,
        db: AsyncSession,
        receipt_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> ReceiptAnalysisResponse:
        """Generates the structured grocery purchase intelligence dataset for Phase 6 Family Risk Engine."""
        stmt = (
            select(Receipt)
            .where(and_(Receipt.id == receipt_id, Receipt.owner_user_id == owner_user_id))
            .options(
                selectinload(Receipt.items).selectinload(ReceiptItem.product).selectinload(Product.brand),
                selectinload(Receipt.items).selectinload(ReceiptItem.product).selectinload(Product.category),
                selectinload(Receipt.items).selectinload(ReceiptItem.product).selectinload(Product.product_ingredients),
                selectinload(Receipt.events),
            )
        )
        receipt = (await db.execute(stmt)).scalars().first()
        if not receipt:
            raise ValueError("Receipt not found or unauthorized access")

        matched_purchased_products: List[PurchasedProductItem] = []
        unresolved_items: List[ReceiptItemResponse] = []

        total_items = len(receipt.items)
        matched_count = 0
        ambiguous_count = 0
        unknown_count = 0
        total_spend = 0.0

        for item in receipt.items:
            if item.total_price:
                total_spend += float(item.total_price)
            elif item.unit_price and item.quantity:
                total_spend += float(item.unit_price * item.quantity)

            if item.product_id and item.product:
                matched_count += 1
                # Generate Phase 3/2 unified product analysis profile
                prod_analysis = await analyze_product(db, item.product_id)
                prod_dict = prod_analysis.model_dump() if prod_analysis else {}

                matched_purchased_products.append(
                    PurchasedProductItem(
                        item_id=item.id,
                        product_id=item.product.id,
                        product_name=item.product.name,
                        quantity=float(item.quantity or 1.0),
                        unit_price=float(item.unit_price) if item.unit_price is not None else None,
                        total_price=float(item.total_price) if item.total_price is not None else None,
                        purchase_date=receipt.purchase_date or receipt.created_at,
                        source="receipt",
                        product_analysis=prod_dict,
                    )
                )
            else:
                if item.requires_selection:
                    ambiguous_count += 1
                else:
                    unknown_count += 1

                unresolved_items.append(ReceiptItemResponse.model_validate(item))

        coverage_ratio = round(matched_count / total_items, 2) if total_items > 0 else 0.0
        ready_for_phase6 = (unresolved_count := (ambiguous_count + unknown_count)) == 0 and total_items > 0

        coverage = ReceiptCoverageSummary(
            total_items=total_items,
            matched=matched_count,
            ambiguous=ambiguous_count,
            unknown=unknown_count,
            coverage_ratio=coverage_ratio,
        )

        return ReceiptAnalysisResponse(
            receipt_id=receipt.id,
            processing_status=receipt.processing_status,
            purchase_date=receipt.purchase_date or receipt.created_at,
            currency=receipt.currency or "INR",
            total_spend=round(total_spend, 2) if total_spend > 0 else receipt.total_amount,
            coverage=coverage,
            ready_for_family_risk_engine=ready_for_phase6,
            matched_products=matched_purchased_products,
            unresolved_items=unresolved_items,
            ocr_confidence=float(receipt.ocr_confidence) if receipt.ocr_confidence is not None else None,
        )

    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------

    async def _recalculate_receipt_status(self, db: AsyncSession, receipt_id: uuid.UUID):
        """Re-evaluates processing_status (processed vs partial)."""
        stmt = select(Receipt).where(Receipt.id == receipt_id).options(selectinload(Receipt.items))
        receipt = (await db.execute(stmt)).scalars().first()
        if not receipt:
            return

        items = receipt.items or []
        if not items:
            receipt.processing_status = "uploaded"
            return

        unresolved = any(
            (i.requires_selection or (i.requires_verification and not i.product_id)) for i in items
        )
        receipt.processing_status = "partial" if unresolved else "processed"

    async def _build_receipt_response(self, db: AsyncSession, receipt: Receipt) -> ReceiptResponse:
        """Constructs rich ReceiptResponse with candidate products and metrics."""
        items = receipt.items or []
        total_items = len(items)
        matched = 0
        ambiguous = 0
        unknown = 0

        item_responses: List[ReceiptItemResponse] = []

        # Collect all candidate product IDs across ambiguous items to fetch in batch
        all_candidate_ids = set()
        for item in items:
            if item.candidate_product_ids:
                try:
                    c_ids = json.loads(item.candidate_product_ids)
                    for cid in c_ids:
                        all_candidate_ids.add(uuid.UUID(cid))
                except Exception:
                    pass

        candidates_map: Dict[uuid.UUID, Product] = {}
        if all_candidate_ids:
            cand_stmt = (
                select(Product)
                .where(Product.id.in_(all_candidate_ids))
                .options(selectinload(Product.brand), selectinload(Product.category))
            )
            cand_prods = (await db.execute(cand_stmt)).scalars().all()
            for cp in cand_prods:
                candidates_map[cp.id] = cp

        for item in items:
            item_resp = ReceiptItemResponse.model_validate(item)

            if item.product:
                matched += 1
                item_resp.product = _build_product_detail(item.product)
            else:
                if item.requires_selection:
                    ambiguous += 1
                else:
                    unknown += 1

            # Populate candidate products
            if item.candidate_product_ids:
                try:
                    c_ids = [uuid.UUID(cid) for cid in json.loads(item.candidate_product_ids)]
                    item_resp.candidate_products = [
                        _build_product_summary(candidates_map[cid])
                        for cid in c_ids
                        if cid in candidates_map
                    ]
                except Exception:
                    item_resp.candidate_products = []

            item_responses.append(item_resp)

        cov_ratio = round(matched / total_items, 2) if total_items > 0 else 0.0

        event_responses = [
            ReceiptProcessingEventResponse.model_validate(ev)
            for ev in (receipt.events or [])
        ]

        resp = ReceiptResponse.model_validate(receipt)
        resp.items_count = total_items
        resp.matched_count = matched
        resp.ambiguous_count = ambiguous
        resp.unknown_count = unknown
        resp.coverage_ratio = cov_ratio
        resp.items = item_responses
        resp.events = event_responses
        return resp


# Singleton instance
receipt_service = ReceiptService()
