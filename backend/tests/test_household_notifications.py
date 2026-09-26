import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.family import Family
from app.models.family_member import FamilyMember
from app.models.allergy import Allergy
from app.models.product import Product
from app.models.receipt import Receipt
from app.models.receipt_item import ReceiptItem
from app.models.notification_preference import NotificationPreference
from app.models.family_notification import FamilyNotification
from app.data.product_seed_data import seed_product_knowledge
from app.services.family_risk_service import family_risk_service
from app.services.notification_service import NotificationService
from app.schemas.history import RecurringPatternItem


@pytest.fixture(autouse=True)
async def seed_data(db_session: AsyncSession):
    await seed_product_knowledge(db_session)


@pytest.fixture
async def seeded_family(db_session: AsyncSession, user_a: User):
    family = Family(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        name="Alert Test Family",
    )
    db_session.add(family)
    await db_session.flush()

    father = FamilyMember(
        id=uuid.uuid4(),
        family_id=family.id,
        name="Father",
        relationship="Parent",
    )
    db_session.add(father)
    await db_session.flush()
    db_session.add(
        Allergy(
            id=uuid.uuid4(),
            member_id=father.id,
            name="Peanut",
            severity="severe",
        )
    )
    db_session.add(
        NotificationPreference(
            id=uuid.uuid4(),
            member_id=father.id,
            in_app_enabled=True,
            push_enabled=True,
            whatsapp_enabled=False,
            emergency_call_enabled=False,
        )
    )
    await db_session.commit()
    return family, father


@pytest.fixture
async def peanut_receipt(db_session: AsyncSession, user_a: User, seeded_family):
    family, _father = seeded_family
    prod = Product(
        id=uuid.uuid4(),
        name="Demo Roasted Peanuts",
        normalized_name="demo roasted peanuts",
        barcode="8901234560098",
        confidence=1.0,
    )
    db_session.add(prod)
    await db_session.flush()

    from app.models.ingredient import Ingredient
    from app.models.product_ingredient import ProductIngredient

    stmt_ing = select(Ingredient).where(Ingredient.canonical_name == "peanut")
    ing_peanut = (await db_session.execute(stmt_ing)).scalars().first()
    db_session.add(
        ProductIngredient(
            id=uuid.uuid4(),
            product_id=prod.id,
            ingredient_id=ing_peanut.id if ing_peanut else None,
            raw_name="Roasted Peanuts",
            normalized_name="peanut",
            sequence=1,
            match_method="exact",
            match_confidence=1.0,
        )
    )

    receipt = Receipt(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        family_id=family.id,
        processing_status="processed",
    )
    db_session.add(receipt)
    await db_session.flush()
    db_session.add(
        ReceiptItem(
            id=uuid.uuid4(),
            receipt_id=receipt.id,
            line_number=1,
            raw_text="PEANUTS",
            product_name_raw="Demo Roasted Peanuts",
            product_id=prod.id,
            match_method="exact_name",
            match_confidence=0.99,
        )
    )
    await db_session.commit()
    return receipt, family, prod


async def _analyze_and_get_notifications(db_session, user_a, receipt):
    await family_risk_service.analyze_receipt_risk(
        db=db_session,
        receipt_id=receipt.id,
        owner_user_id=user_a.id,
    )
    stmt = select(FamilyNotification).where(FamilyNotification.receipt_id == receipt.id)
    return (await db_session.execute(stmt)).scalars().all()


@pytest.mark.asyncio
async def test_high_attention_notification_created(
    db_session: AsyncSession,
    user_a: User,
    peanut_receipt,
):
    receipt, _family, _prod = peanut_receipt
    rows = await _analyze_and_get_notifications(db_session, user_a, receipt)
    high = [r for r in rows if r.type == "HIGH_ATTENTION"]
    assert len(high) >= 1
    assert high[0].status == "unread"
    assert high[0].finding_id is not None


@pytest.mark.asyncio
async def test_verification_required_notification_created(
    db_session: AsyncSession,
    user_a: User,
    seeded_family,
):
    family, _father = seeded_family
    from app.models.dietary_rule import DietaryRule
    db_session.add(
        DietaryRule(
            id=uuid.uuid4(),
            member_id=_father.id,
            rule_type="dietary",
            rule_value="vegetarian",
            label="Vegetarian",
        )
    )
    await db_session.flush()

    stmt_p = select(Product).where(Product.name == "Demo Protein Bar")
    prod = (await db_session.execute(stmt_p)).scalars().first()
    assert prod is not None

    receipt = Receipt(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        family_id=family.id,
        processing_status="processed",
    )
    db_session.add(receipt)
    await db_session.flush()
    db_session.add(
        ReceiptItem(
            id=uuid.uuid4(),
            receipt_id=receipt.id,
            line_number=1,
            raw_text="PROTEIN BAR",
            product_name_raw="Demo Protein Bar",
            product_id=prod.id,
            match_method="exact_name",
            match_confidence=0.98,
        )
    )
    await db_session.commit()

    rows = await _analyze_and_get_notifications(db_session, user_a, receipt)
    verify = [r for r in rows if r.type == "VERIFICATION_REQUIRED"]
    assert len(verify) >= 1


@pytest.mark.asyncio
async def test_notification_respects_in_app_preference(
    db_session: AsyncSession,
    user_a: User,
    peanut_receipt,
    seeded_family,
):
    receipt, _family, _prod = peanut_receipt
    _family, father = seeded_family
    pref = (
        await db_session.execute(
            select(NotificationPreference).where(NotificationPreference.member_id == father.id)
        )
    ).scalars().first()
    pref.in_app_enabled = False
    await db_session.commit()

    rows = await _analyze_and_get_notifications(db_session, user_a, receipt)
    assert len(rows) == 0


@pytest.mark.asyncio
async def test_duplicate_notification_prevented(
    db_session: AsyncSession,
    user_a: User,
    peanut_receipt,
):
    receipt, family, _prod = peanut_receipt
    analysis = await family_risk_service.analyze_receipt_risk(
        db=db_session, receipt_id=receipt.id, owner_user_id=user_a.id
    )
    from sqlalchemy import delete
    await db_session.execute(delete(FamilyNotification).where(FamilyNotification.receipt_id == receipt.id))
    await db_session.commit()

    created_once = await NotificationService.generate_for_risk_analysis(
        db_session, family.id, receipt.id, uuid.UUID(str(analysis.id))
    )
    created_twice = await NotificationService.generate_for_risk_analysis(
        db_session, family.id, receipt.id, uuid.UUID(str(analysis.id))
    )
    assert created_once >= 1
    assert created_twice == 0


@pytest.mark.asyncio
async def test_unread_count_and_mark_read(
    client: AsyncClient,
    auth_headers_user_a: dict,
    db_session: AsyncSession,
    user_a: User,
    peanut_receipt,
):
    receipt, family, _prod = peanut_receipt
    rows = await _analyze_and_get_notifications(db_session, user_a, receipt)
    assert len(rows) >= 1

    count_res = await client.get(
        f"/api/notifications/unread-count?family_id={family.id}",
        headers=auth_headers_user_a,
    )
    assert count_res.status_code == 200
    assert count_res.json()["unread_count"] >= 1

    nid = rows[0].id
    read_res = await client.put(f"/api/notifications/{nid}/read", headers=auth_headers_user_a)
    assert read_res.status_code == 200
    assert read_res.json()["status"] == "read"

    count_res2 = await client.get(
        f"/api/notifications/unread-count?family_id={family.id}",
        headers=auth_headers_user_a,
    )
    assert count_res2.json()["unread_count"] >= 0


@pytest.mark.asyncio
async def test_mark_all_read(
    client: AsyncClient,
    auth_headers_user_a: dict,
    db_session: AsyncSession,
    user_a: User,
    peanut_receipt,
):
    receipt, family, _prod = peanut_receipt
    await _analyze_and_get_notifications(db_session, user_a, receipt)

    res = await client.put(
        f"/api/notifications/read-all?family_id={family.id}",
        headers=auth_headers_user_a,
    )
    assert res.status_code == 200
    assert res.json()["marked_read"] >= 1

    count_res = await client.get(
        f"/api/notifications/unread-count?family_id={family.id}",
        headers=auth_headers_user_a,
    )
    assert count_res.json()["unread_count"] == 0


@pytest.mark.asyncio
async def test_cross_family_access_denied(
    client: AsyncClient,
    auth_headers_user_b: dict,
    db_session: AsyncSession,
    user_a: User,
    peanut_receipt,
):
    receipt, family, _prod = peanut_receipt
    rows = await _analyze_and_get_notifications(db_session, user_a, receipt)
    assert len(rows) >= 1

    get_res = await client.get(
        f"/api/notifications/{rows[0].id}",
        headers=auth_headers_user_b,
    )
    assert get_res.status_code == 404

    list_res = await client.get(
        f"/api/notifications?family_id={family.id}",
        headers=auth_headers_user_b,
    )
    assert list_res.status_code in (403, 404)


@pytest.mark.asyncio
async def test_recurring_threshold_at_least_three(
    db_session: AsyncSession,
    seeded_family,
):
    family, _father = seeded_family
    patterns = [
        RecurringPatternItem(
            pattern_type="recurring_source_uncertainty",
            title="INS 471 pattern",
            description="Source verification findings across purchases.",
            supporting_purchase_count=2,
            supporting_product_count=2,
            actionable_review="Review history",
        ),
        RecurringPatternItem(
            pattern_type="recurring_source_uncertainty",
            title="INS 471 pattern",
            description="Source verification findings across purchases.",
            supporting_purchase_count=3,
            supporting_product_count=3,
            actionable_review="Review history",
        ),
    ]
    created_low = await NotificationService.generate_recurring_notifications(
        db_session, family.id, [patterns[0]], period_key="all"
    )
    created_high = await NotificationService.generate_recurring_notifications(
        db_session, family.id, [patterns[1]], period_key="all"
    )
    assert created_low == 0
    assert created_high == 1

    created_dup = await NotificationService.generate_recurring_notifications(
        db_session, family.id, [patterns[1]], period_key="all"
    )
    assert created_dup == 0
