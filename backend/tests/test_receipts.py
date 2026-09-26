import pytest
import uuid
import io
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.receipt import Receipt
from app.models.receipt_item import ReceiptItem
from app.models.receipt_processing_event import ReceiptProcessingEvent
from app.models.product import Product
from app.data.product_seed_data import seed_product_knowledge
from app.services.receipt_ocr_service import receipt_ocr_service
from app.engines.receipt_parser import parse_receipt_text
from app.engines.receipt_line_classifier import classify_receipt_line


@pytest.fixture(autouse=True)
async def seed_data(db_session: AsyncSession):
    """Seed product & ingredient knowledge base automatically for all receipt tests."""
    await seed_product_knowledge(db_session)
    receipt_ocr_service.clear_mock()
    yield
    receipt_ocr_service.clear_mock()


# Tiny valid 1x1 GIF bytes for upload test
TINY_GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04"
    b"\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


# ============================================================
# 1. Receipt Creation & Upload Tests
# ============================================================

@pytest.mark.asyncio
async def test_receipt_upload_and_metadata(
    client: AsyncClient,
    user_a: User,
    auth_headers_user_a: dict,
    db_session: AsyncSession,
):
    """Uploads a receipt image and verifies database record, ownership, and initial status."""
    files = {"file": ("receipt.png", io.BytesIO(TINY_GIF), "image/png")}
    resp = await client.post("/api/receipts", headers=auth_headers_user_a, files=files)
    assert resp.status_code == 201
    data = resp.json()

    assert "id" in data
    assert data["owner_user_id"] == str(user_a.id)
    assert data["processing_status"] == "uploaded"
    assert data["original_filename"] == "receipt.png"
    assert data["image_url"].startswith("/api/receipts/")

    receipt_id = uuid.UUID(data["id"])
    stmt = select(Receipt).where(Receipt.id == receipt_id)
    r = (await db_session.execute(stmt)).scalars().first()
    assert r is not None
    assert r.owner_user_id == user_a.id


# ============================================================
# 2. Line Classification & Non-Product Filtering
# ============================================================

def test_receipt_line_classification_and_filtering():
    """Critical Test 4: Verifies deterministic exclusion of subtotal, tax, totals, payment, and metadata."""
    assert classify_receipt_line("SUBTOTAL 510.00")["line_type"] == "subtotal"
    assert classify_receipt_line("SUB TOTAL 510.00")["line_type"] == "subtotal"
    assert classify_receipt_line("CGST 2.5% 12.50")["line_type"] == "tax"
    assert classify_receipt_line("SGST 2.5% 12.50")["line_type"] == "tax"
    assert classify_receipt_line("GST 12.50")["line_type"] == "tax"
    assert classify_receipt_line("GRAND TOTAL 535.00")["line_type"] == "total"
    assert classify_receipt_line("TOTAL 522.50")["line_type"] == "total"
    assert classify_receipt_line("CARD 522.50")["line_type"] == "payment"
    assert classify_receipt_line("CASH TENDERED 600.00")["line_type"] == "payment"
    assert classify_receipt_line("UPI PAYMENT SUCCESSFUL")["line_type"] == "payment"
    assert classify_receipt_line("CHANGE DUE 77.50")["line_type"] == "payment"
    assert classify_receipt_line("INVOICE NO: INV-98762")["line_type"] == "store_metadata"
    assert classify_receipt_line("THANK YOU FOR SHOPPING")["line_type"] == "store_metadata"
    assert classify_receipt_line("-----------------------------")["line_type"] == "separator"

    # Product lines must be recognized as product
    assert classify_receipt_line("BRIT NUTR CHC 40G 40.00")["line_type"] == "product"
    assert classify_receipt_line("AASH ATT 5KG 320.00")["line_type"] == "product"
    assert classify_receipt_line("KISS TOM KETCHUP 150.00")["line_type"] == "product"


def test_receipt_parser_end_to_end_filtering():
    """Verifies that non-product lines do NOT become grocery line items."""
    raw_ocr = """
    DEMO SUPERMARKET
    BANGALORE IND
    TAX INVOICE
    DATE: 2026-09-20
    ---------------------------
    BRIT NUTR CHC 40G     40.00
    AASH ATT 5KG         320.00
    KISS TOM KETCHUP     150.00
    ---------------------------
    SUBTOTAL             510.00
    CGST                  12.50
    SGST                  12.50
    TOTAL                535.00
    CARD                 535.00
    CHANGE                 0.00
    THANK YOU VISIT AGAIN
    """
    parsed = parse_receipt_text(raw_ocr)
    items = parsed["items"]
    meta = parsed["metadata"]

    assert len(items) == 3
    names = [it["product_name_raw"] for it in items]
    assert "BRIT NUTR CHC 40G" in names
    assert "AASH ATT 5KG" in names
    assert "KISS TOM KETCHUP" in names

    # Totals & metadata parsed accurately
    assert meta["subtotal"] == 510.0
    assert meta["grand_total"] == 535.0
    assert meta["tax"] == 25.0  # 12.50 + 12.50
    assert meta["purchase_date"].startswith("2026-09-20")


# ============================================================
# 3. Critical Test 1: Exact High-Confidence Match
# ============================================================

@pytest.mark.asyncio
async def test_critical_test_1_exact_match(
    client: AsyncClient,
    user_a: User,
    auth_headers_user_a: dict,
):
    """Critical Test 1:
    OCR: 'BRIT NUTR CHC 40G 40.00'
    Expected: Matches Britannia NutriChoice with high confidence.
    """
    receipt_ocr_service.set_mock_result("BRIT NUTR CHC 40G 40.00\nTOTAL 40.00", confidence=0.95)

    # 1. Upload receipt
    files = {"file": ("receipt.png", io.BytesIO(TINY_GIF), "image/png")}
    create_resp = await client.post("/api/receipts", headers=auth_headers_user_a, files=files)
    assert create_resp.status_code == 201
    receipt_id = create_resp.json()["id"]

    # 2. Process receipt
    proc_resp = await client.post(f"/api/receipts/{receipt_id}/process", headers=auth_headers_user_a)
    assert proc_resp.status_code == 200
    data = proc_resp.json()

    assert data["processing_status"] in ("processed", "partial")
    items = data["items"]
    assert len(items) == 1

    item = items[0]
    assert item["product_name_raw"] == "BRIT NUTR CHC 40G"
    assert item["total_price"] == 40.0
    assert item["product"] is not None
    assert "NutriChoice" in item["product"]["name"]
    assert item["match_confidence"] >= 0.80
    assert item["requires_selection"] is False
    assert item["requires_verification"] is False


# ============================================================
# 4. Critical Test 2: Ambiguous Match Requires User Selection
# ============================================================

@pytest.mark.asyncio
async def test_critical_test_2_ambiguous_match_requires_selection(
    client: AsyncClient,
    user_a: User,
    auth_headers_user_a: dict,
):
    """Critical Test 2:
    OCR: 'CHOC BIS 40 40.00'
    Expected: Multiple candidates, requires_selection=True, no silent auto-assignment.
    """
    receipt_ocr_service.set_mock_result("CHOC BIS 40 40.00\nTOTAL 40.00", confidence=0.90)

    files = {"file": ("receipt.png", io.BytesIO(TINY_GIF), "image/png")}
    create_resp = await client.post("/api/receipts", headers=auth_headers_user_a, files=files)
    receipt_id = create_resp.json()["id"]

    proc_resp = await client.post(f"/api/receipts/{receipt_id}/process", headers=auth_headers_user_a)
    assert proc_resp.status_code == 200
    data = proc_resp.json()

    items = data["items"]
    assert len(items) == 1
    item = items[0]

    # Must require selection, candidates populated, not forced into one product
    assert item["requires_selection"] is True
    assert len(item["candidate_products"]) >= 1
    # Receipt status must be partial when items require selection
    assert data["processing_status"] == "partial"


# ============================================================
# 5. Critical Test 3: Unknown Item (No Hallucination)
# ============================================================

@pytest.mark.asyncio
async def test_critical_test_3_unknown_item_no_hallucination(
    client: AsyncClient,
    user_a: User,
    auth_headers_user_a: dict,
):
    """Critical Test 3:
    OCR: 'XYZ RANDOM ITEM 99.00'
    Expected: matched=False, requires_verification=True, no product fabricated.
    """
    receipt_ocr_service.set_mock_result("XYZ RANDOM NONEXISTENT ITEM 99.00\nTOTAL 99.00", confidence=0.88)

    files = {"file": ("receipt.png", io.BytesIO(TINY_GIF), "image/png")}
    create_resp = await client.post("/api/receipts", headers=auth_headers_user_a, files=files)
    receipt_id = create_resp.json()["id"]

    proc_resp = await client.post(f"/api/receipts/{receipt_id}/process", headers=auth_headers_user_a)
    assert proc_resp.status_code == 200
    data = proc_resp.json()

    items = data["items"]
    assert len(items) == 1
    item = items[0]

    assert item["product_id"] is None
    assert item["product"] is None
    assert item["requires_verification"] is True
    assert item["requires_selection"] is False


# ============================================================
# 6. Critical Test 5: Resolve Unresolved Item via Barcode Scan
# ============================================================

@pytest.mark.asyncio
async def test_critical_test_5_resolve_barcode_fallback(
    client: AsyncClient,
    user_a: User,
    auth_headers_user_a: dict,
):
    """Critical Test 5:
    Unresolved item is resolved by barcode scan lookup (integrating Phase 4 scanner).
    """
    receipt_ocr_service.set_mock_result("MYSTERY SNACK BAR 90.00\nTOTAL 90.00", confidence=0.85)

    files = {"file": ("receipt.png", io.BytesIO(TINY_GIF), "image/png")}
    create_resp = await client.post("/api/receipts", headers=auth_headers_user_a, files=files)
    receipt_id = create_resp.json()["id"]

    proc_resp = await client.post(f"/api/receipts/{receipt_id}/process", headers=auth_headers_user_a)
    items = proc_resp.json()["items"]
    item_id = items[0]["id"]
    assert items[0]["product_id"] is None

    # Resolve with Demo Protein Bar GTIN: "08901234560010"
    resolve_resp = await client.post(
        f"/api/receipts/items/{item_id}/resolve-barcode",
        headers=auth_headers_user_a,
        json={"identifier_type": "GTIN", "identifier_value": "08901234560010"},
    )
    assert resolve_resp.status_code == 200
    resolved = resolve_resp.json()

    assert resolved["product_id"] is not None
    assert resolved["product"]["name"] == "Demo Protein Bar"
    assert resolved["requires_selection"] is False
    assert resolved["requires_verification"] is False
    assert resolved["match_method"] == "barcode_scan"
    assert resolved["user_corrected"] is True


# ============================================================
# 7. Manual Product Selection and Item Editing
# ============================================================

@pytest.mark.asyncio
async def test_manual_product_selection_and_crud(
    client: AsyncClient,
    user_a: User,
    auth_headers_user_a: dict,
    db_session: AsyncSession,
):
    """Tests manual product resolution, price/qty updates, manual item addition, and item deletion."""
    receipt_ocr_service.set_mock_result("UNKNOWN ATTA 5KG 320.00\nTOTAL 320.00", confidence=0.90)

    files = {"file": ("receipt.png", io.BytesIO(TINY_GIF), "image/png")}
    create_resp = await client.post("/api/receipts", headers=auth_headers_user_a, files=files)
    receipt_id = create_resp.json()["id"]
    await client.post(f"/api/receipts/{receipt_id}/process", headers=auth_headers_user_a)

    items_resp = await client.get(f"/api/receipts/{receipt_id}/items", headers=auth_headers_user_a)
    items = items_resp.json()
    item_id = items[0]["id"]

    # 1. Resolve manually to Aashirvaad Atta
    prod_stmt = select(Product).where(Product.name.ilike("%Aashirvaad%"))
    atta = (await db_session.execute(prod_stmt)).scalars().first()
    assert atta is not None

    resolve_resp = await client.post(
        f"/api/receipts/items/{item_id}/resolve-product",
        headers=auth_headers_user_a,
        json={"product_id": str(atta.id)},
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["product_id"] == str(atta.id)
    assert resolve_resp.json()["match_method"] == "user_selected"

    # 2. Update item quantity and price
    update_resp = await client.put(
        f"/api/receipts/items/{item_id}",
        headers=auth_headers_user_a,
        json={"quantity": 2.0, "unit_price": 310.0, "total_price": 620.0},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["quantity"] == 2.0
    assert update_resp.json()["total_price"] == 620.0

    # 3. Add manual line item
    add_resp = await client.post(
        f"/api/receipts/{receipt_id}/manual-item",
        headers=auth_headers_user_a,
        json={"product_name": "Demo Protein Bar", "quantity": 3.0, "price": 90.0},
    )
    assert add_resp.status_code == 201
    manual_item = add_resp.json()
    assert manual_item["product_name_raw"] == "Demo Protein Bar"
    assert manual_item["quantity"] == 3.0

    # 4. Delete manual line item
    del_resp = await client.delete(
        f"/api/receipts/items/{manual_item['id']}", headers=auth_headers_user_a
    )
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True


# ============================================================
# 8. Receipt Analysis & Phase 6 Handoff
# ============================================================

@pytest.mark.asyncio
async def test_receipt_analysis_summary_and_phase6_handoff(
    client: AsyncClient,
    user_a: User,
    auth_headers_user_a: dict,
):
    """Verifies that GET /api/receipts/{id}/analysis returns the clean purchase dataset
    with Phase 3 product analysis and coverage ratio, ready for Phase 6.
    """
    demo_receipt = """
    DEMO FAMILY GROCERY
    BRIT NUTR CHC 40G     40.00
    DEMO PROTEIN BAR      90.00
    TOTAL                130.00
    """
    receipt_ocr_service.set_mock_result(demo_receipt, confidence=0.94)

    files = {"file": ("receipt.png", io.BytesIO(TINY_GIF), "image/png")}
    create_resp = await client.post("/api/receipts", headers=auth_headers_user_a, files=files)
    receipt_id = create_resp.json()["id"]

    await client.post(f"/api/receipts/{receipt_id}/process", headers=auth_headers_user_a)

    analysis_resp = await client.get(
        f"/api/receipts/{receipt_id}/analysis", headers=auth_headers_user_a
    )
    assert analysis_resp.status_code == 200
    data = analysis_resp.json()

    assert data["receipt_id"] == receipt_id
    assert "coverage" in data
    assert data["coverage"]["total_items"] == 2
    assert data["coverage"]["matched"] >= 1
    assert "ready_for_family_risk_engine" in data

    # Check matched purchases have product_analysis
    for purchase in data["matched_products"]:
        assert "product_id" in purchase
        assert "product_name" in purchase
        assert "quantity" in purchase
        assert purchase["source"] == "receipt"
        assert "product_analysis" in purchase
        prod_analysis = purchase["product_analysis"]
        assert "allergens" in prod_analysis or "ingredients" in prod_analysis


# ============================================================
# 9. Security & Access Isolation
# ============================================================

@pytest.mark.asyncio
async def test_cross_user_receipt_security_isolation(
    client: AsyncClient,
    user_a: User,
    user_b: User,
    auth_headers_user_a: dict,
    auth_headers_user_b: dict,
):
    """User B must not access or modify User A's receipt."""
    files = {"file": ("alice_receipt.png", io.BytesIO(TINY_GIF), "image/png")}
    create_resp = await client.post("/api/receipts", headers=auth_headers_user_a, files=files)
    assert create_resp.status_code == 201
    receipt_id = create_resp.json()["id"]

    # User B tries to view Alice's receipt
    get_resp = await client.get(f"/api/receipts/{receipt_id}", headers=auth_headers_user_b)
    assert get_resp.status_code == 404

    # User B tries to process Alice's receipt
    proc_resp = await client.post(f"/api/receipts/{receipt_id}/process", headers=auth_headers_user_b)
    assert proc_resp.status_code == 404

    # User B tries to view Alice's receipt analysis
    anal_resp = await client.get(f"/api/receipts/{receipt_id}/analysis", headers=auth_headers_user_b)
    assert anal_resp.status_code == 404


# ============================================================
# 10. Idempotency Test
# ============================================================

@pytest.mark.asyncio
async def test_receipt_processing_idempotency(
    client: AsyncClient,
    user_a: User,
    auth_headers_user_a: dict,
):
    """Repeated processing of the SAME receipt must be idempotent and not create duplicate items."""
    receipt_ocr_service.set_mock_result("BRIT NUTR CHC 40G 40.00\nTOTAL 40.00", confidence=0.92)

    files = {"file": ("receipt.png", io.BytesIO(TINY_GIF), "image/png")}
    create_resp = await client.post("/api/receipts", headers=auth_headers_user_a, files=files)
    receipt_id = create_resp.json()["id"]

    # Run processing twice
    proc1 = await client.post(f"/api/receipts/{receipt_id}/process", headers=auth_headers_user_a)
    assert proc1.status_code == 200
    items1 = proc1.json()["items"]
    assert len(items1) == 1

    proc2 = await client.post(f"/api/receipts/{receipt_id}/process", headers=auth_headers_user_a)
    assert proc2.status_code == 200
    items2 = proc2.json()["items"]
    assert len(items2) == 1  # Still 1, NOT duplicated to 2
