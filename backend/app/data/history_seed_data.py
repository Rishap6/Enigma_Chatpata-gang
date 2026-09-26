import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.receipt import Receipt
from app.models.receipt_item import ReceiptItem
from app.services.family_risk_service import family_risk_service
from app.services.historical_grocery_service import historical_grocery_service


async def seed_family_purchase_history(
    db: AsyncSession,
    family_id: uuid.UUID,
    user_id: uuid.UUID,
) -> List[uuid.UUID]:
    """Generates a deterministic 4-receipt grocery purchase history for testing and hackathon demo:
    - Receipt 1 (35 days ago - previous month): Protein Bar, Biscuit, Bread, Cooking Oil/Butter
    - Receipt 2 (18 days ago - current month): Protein Bar, Biscuit, Gelatin Gummy, Tata Salt
    - Receipt 3 (8 days ago - current month): Protein Bar, Bread, Good Day, Cross-Contact Snack
    - Receipt 4 (2 days ago - current month): Protein Bar, Biscuit, Butter, 1 Unresolved Item

    Demonstrates:
    - Recurring product (Protein Bar purchased 4 times)
    - Recurring allergen (Gluten / Wheat appearing across Bread, Biscuit, Good Day)
    - Recurring derived allergen (Maida -> Wheat -> Gluten)
    - Recurring source uncertainty (INS 471)
    - Cross-contact precautionary findings
    - Member-specific personalized divergence
    - Period-over-period comparison (Previous Month vs Current Month)
    - Historical catalog coverage & unresolved product indicators
    """
    # 1. Fetch catalog products
    stmt_products = select(Product)
    products = (await db.execute(stmt_products)).scalars().all()
    product_map: Dict[str, Product] = {p.name.lower(): p for p in products}

    # Products to use
    p_protein_bar = product_map.get("demo protein bar")
    p_biscuit = product_map.get("demo biscuit")
    p_gummy = product_map.get("demo gelatin gummy")
    p_butter = product_map.get("amul taaza homogenised toned milk") or product_map.get("amul butter") or p_biscuit
    p_bread = product_map.get("britannia daily fresh white bread") or product_map.get("demo wheat bread") or p_biscuit
    p_good_day = product_map.get("britannia nutrichoice digestive biscuit") or p_biscuit
    p_chips = product_map.get("lay's classic salted potato chips") or product_map.get("demo cross-contact snack") or p_biscuit

    now = datetime.now(timezone.utc)
    receipt_definitions = [
        # Receipt 1: ~35 days ago (Previous Period)
        {
            "days_ago": 35,
            "items": [
                (p_protein_bar, "DEMO PROTEIN BAR 60G", 1.0, 120.00),
                (p_biscuit, "DEMO BISCUIT 100G", 2.0, 45.00),
                (p_bread, "WHOLE GRAIN BREAD 400G", 1.0, 50.00),
                (p_butter, "AMUL BUTTER 100G", 1.0, 58.00),
            ],
        },
        # Receipt 2: ~18 days ago (Current Month)
        {
            "days_ago": 18,
            "items": [
                (p_protein_bar, "DEMO PROTEIN BAR 60G", 2.0, 120.00),
                (p_biscuit, "DEMO BISCUIT 100G", 1.0, 45.00),
                (p_gummy, "DEMO GELATIN GUMMY 80G", 1.0, 60.00),
            ],
        },
        # Receipt 3: ~8 days ago (Current Month)
        {
            "days_ago": 8,
            "items": [
                (p_protein_bar, "DEMO PROTEIN BAR 60G", 1.0, 120.00),
                (p_bread, "WHOLE GRAIN BREAD 400G", 1.0, 50.00),
                (p_good_day, "BRITANNIA GOOD DAY 120G", 2.0, 40.00),
                (p_chips, "LAY'S CLASSIC SALTED 50G", 1.0, 20.00),
            ],
        },
        # Receipt 4: ~2 days ago (Current Month)
        {
            "days_ago": 2,
            "items": [
                (p_protein_bar, "DEMO PROTEIN BAR 60G", 1.0, 125.00),  # price change!
                (p_biscuit, "DEMO BISCUIT 100G", 1.0, 45.00),
                (p_butter, "AMUL BUTTER 100G", 1.0, 60.00),
                (None, "ORGANIC HIMALAYAN GRANOLA 200G", 1.0, 180.00),  # Unresolved item!
            ],
        },
    ]

    created_receipt_ids: List[uuid.UUID] = []

    for r_idx, r_def in enumerate(receipt_definitions):
        purchase_dt = now - timedelta(days=r_def["days_ago"])
        rcpt_id = uuid.uuid4()
        ocr_lines = []
        subtotal = 0.0

        for _, line_text, qty, price in r_def["items"]:
            total_l = qty * price
            subtotal += total_l
            ocr_lines.append(f"{line_text} {qty:.1f}x {price:.2f} = {total_l:.2f}")

        rcpt = Receipt(
            id=rcpt_id,
            owner_user_id=user_id,
            family_id=family_id,
            purchase_date=purchase_dt,
            ocr_text="\n".join(ocr_lines),
            processing_status="completed",
            subtotal=round(subtotal, 2),
            tax=round(subtotal * 0.05, 2),
            total_amount=round(subtotal * 1.05, 2),
            currency="INR",
            created_at=purchase_dt,
        )
        db.add(rcpt)
        await db.flush()

        for l_idx, (prod, raw_text, qty, price) in enumerate(r_def["items"]):
            db.add(
                ReceiptItem(
                    id=uuid.uuid4(),
                    receipt_id=rcpt.id,
                    line_number=l_idx + 1,
                    raw_text=raw_text,
                    product_name_raw=prod.name if prod else raw_text,
                    product_id=prod.id if prod else None,
                    quantity=qty,
                    unit_price=price,
                    total_price=round(qty * price, 2),
                    match_method="exact_catalog" if prod else "unresolved",
                    match_confidence=0.98 if prod else None,
                    requires_selection=(prod is None),
                    created_at=purchase_dt,
                )
            )

        await db.commit()
        created_receipt_ids.append(rcpt.id)

        # Run Family Risk Analysis on this receipt
        try:
            await family_risk_service.analyze_receipt_risk(
                db=db,
                receipt_id=rcpt.id,
                owner_user_id=user_id,
                family_id=family_id,
            )
        except Exception as e:
            print(f"Risk analysis note for demo receipt {rcpt.id}: {e}")

    # Synchronize historical snapshots
    await historical_grocery_service.sync_family_history(db, family_id)
    return created_receipt_ids
