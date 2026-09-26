import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "family-food-intelligence"


@pytest.mark.asyncio
async def test_create_and_get_family(client: AsyncClient, auth_headers_user_a: dict):
    # 1. Create Family
    resp = await client.post(
        "/api/families",
        json={"name": "Khatri Family"},
        headers=auth_headers_user_a,
    )
    assert resp.status_code == 201
    family = resp.json()
    assert family["name"] == "Khatri Family"
    family_id = family["id"]

    # 2. Get Family
    get_resp = await client.get(f"/api/families/{family_id}", headers=auth_headers_user_a)
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Khatri Family"

    # 3. Update Family
    put_resp = await client.put(
        f"/api/families/{family_id}",
        json={"name": "The Khatri Household"},
        headers=auth_headers_user_a,
    )
    assert put_resp.status_code == 200
    assert put_resp.json()["name"] == "The Khatri Household"


@pytest.mark.asyncio
async def test_member_crud_and_requirements(client: AsyncClient, auth_headers_user_a: dict):
    # Setup: Create Family
    f_resp = await client.post(
        "/api/families",
        json={"name": "Sharma Family"},
        headers=auth_headers_user_a,
    )
    family_id = f_resp.json()["id"]

    # 3. Create Member
    m_resp = await client.post(
        f"/api/families/{family_id}/members",
        json={
            "name": "Father",
            "age": 52,
            "relationship": "Father",
            "notes": "Loves cooking and family dinners",
        },
        headers=auth_headers_user_a,
    )
    assert m_resp.status_code == 201
    member = m_resp.json()
    assert member["name"] == "Father"
    assert member["age"] == 52
    member_id = member["id"]

    # 4. Update Member
    up_resp = await client.put(
        f"/api/members/{member_id}",
        json={"name": "Father (Rajesh)", "age": 53},
        headers=auth_headers_user_a,
    )
    assert up_resp.status_code == 200
    assert up_resp.json()["name"] == "Father (Rajesh)"
    assert up_resp.json()["age"] == 53

    # 6. Add Allergy
    a_resp = await client.post(
        f"/api/members/{member_id}/allergies",
        json={"name": "Peanut", "severity": "severe", "notes": "Carries EpiPen"},
        headers=auth_headers_user_a,
    )
    assert a_resp.status_code == 201
    allergy = a_resp.json()
    assert allergy["name"] == "Peanut"
    assert allergy["severity"] == "severe"
    allergy_id = allergy["id"]

    # Update Allergy (e.g. from severe to moderate)
    a_put = await client.put(
        f"/api/allergies/{allergy_id}",
        json={"severity": "moderate"},
        headers=auth_headers_user_a,
    )
    assert a_put.status_code == 200
    assert a_put.json()["severity"] == "moderate"

    # 8. Add Dietary Rule
    d_resp = await client.post(
        f"/api/members/{member_id}/dietary-rules",
        json={"rule_type": "dietary", "rule_value": "vegetarian", "label": "Vegetarian"},
        headers=auth_headers_user_a,
    )
    assert d_resp.status_code == 201
    assert d_resp.json()["rule_value"] == "vegetarian"
    dietary_id = d_resp.json()["id"]

    # 9. Add Ingredient Exclusion
    i_resp = await client.post(
        f"/api/members/{member_id}/ingredient-exclusions",
        json={"ingredient_name": "Gelatin", "reason": "Animal-derived gelatin"},
        headers=auth_headers_user_a,
    )
    assert i_resp.status_code == 201
    assert i_resp.json()["ingredient_name"] == "Gelatin"
    exclusion_id = i_resp.json()["id"]

    # 10. Add Nutrition Preference
    p_resp = await client.post(
        f"/api/members/{member_id}/nutrition-preferences",
        json={"preference_type": "reduce_sodium", "preference_value": "true"},
        headers=auth_headers_user_a,
    )
    assert p_resp.status_code == 201
    assert p_resp.json()["preference_type"] == "reduce_sodium"

    # 11. Add Custom Rule
    c_resp = await client.post(
        f"/api/members/{member_id}/custom-rules",
        json={"rule_text": "Avoid products containing onion or garlic."},
        headers=auth_headers_user_a,
    )
    assert c_resp.status_code == 201
    assert "onion or garlic" in c_resp.json()["rule_text"]
    custom_rule_id = c_resp.json()["id"]

    # 12. Add Emergency Contact
    ec_resp = await client.post(
        f"/api/members/{member_id}/emergency-contacts",
        json={
            "name": "Mother",
            "relationship": "Spouse",
            "phone": "+919876543210",
            "whatsapp_number": "+919876543210",
            "is_primary": True,
        },
        headers=auth_headers_user_a,
    )
    assert ec_resp.status_code == 201
    assert ec_resp.json()["name"] == "Mother"
    assert ec_resp.json()["is_primary"] is True
    contact_id = ec_resp.json()["id"]

    # 13. Update Notification Settings
    notif_resp = await client.put(
        f"/api/members/{member_id}/notification-preferences",
        json={"in_app_enabled": True, "emergency_call_enabled": True, "whatsapp_enabled": False},
        headers=auth_headers_user_a,
    )
    assert notif_resp.status_code == 200
    assert notif_resp.json()["emergency_call_enabled"] is True

    # Check complete member profile
    full_member_resp = await client.get(f"/api/members/{member_id}", headers=auth_headers_user_a)
    assert full_member_resp.status_code == 200
    m_data = full_member_resp.json()
    assert len(m_data["allergies"]) == 1
    assert len(m_data["dietary_rules"]) == 1
    assert len(m_data["ingredient_exclusions"]) == 1
    assert len(m_data["nutrition_preferences"]) == 1
    assert len(m_data["custom_rules"]) == 1
    assert len(m_data["emergency_contacts"]) == 1

    # Check future engine consumable format
    future_resp = await client.get(f"/api/members/{member_id}/future-requirements", headers=auth_headers_user_a)
    assert future_resp.status_code == 200
    f_data = future_resp.json()
    assert f_data["name"] == "Father (Rajesh)"
    assert f_data["allergies"][0]["name"] == "Peanut"
    assert "vegetarian" in f_data["dietary_rules"]
    assert "Gelatin" in f_data["ingredient_exclusions"]

    # 7. Delete allergy
    del_a = await client.delete(f"/api/allergies/{allergy_id}", headers=auth_headers_user_a)
    assert del_a.status_code == 204

    # 5. Delete member
    del_m = await client.delete(f"/api/members/{member_id}", headers=auth_headers_user_a)
    assert del_m.status_code == 204

    # Verify member is gone
    chk_m = await client.get(f"/api/members/{member_id}", headers=auth_headers_user_a)
    assert chk_m.status_code == 404


@pytest.mark.asyncio
async def test_full_wizard_member_creation(client: AsyncClient, auth_headers_user_a: dict):
    # Test atomic creation with full wizard payload
    f_resp = await client.post(
        "/api/families",
        json={"name": "Wizard Family"},
        headers=auth_headers_user_a,
    )
    family_id = f_resp.json()["id"]

    wizard_payload = {
        "name": "Grandmother",
        "age": 78,
        "relationship": "Grandmother",
        "allergies": [{"name": "Wheat", "severity": "severe", "notes": "Celiac reaction"}],
        "dietary_rules": [{"rule_type": "dietary", "rule_value": "gluten_free", "label": "Gluten-free"}],
        "ingredient_exclusions": [{"ingredient_name": "Palm oil", "reason": "Health"}],
        "nutrition_preferences": [{"preference_type": "weight_management", "preference_value": "true"}],
        "custom_rules": [{"rule_text": "No artificial preservatives."}],
        "emergency_contacts": [
            {
                "name": "Father",
                "phone": "+919876543211",
                "relationship": "Son",
                "is_primary": True,
            }
        ],
        "notification_preferences": {
            "in_app_enabled": True,
            "push_enabled": True,
            "emergency_call_enabled": True,
        },
    }

    resp = await client.post(
        f"/api/families/{family_id}/members",
        json=wizard_payload,
        headers=auth_headers_user_a,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Grandmother"
    assert len(data["allergies"]) == 1
    assert data["allergies"][0]["name"] == "Wheat"
    assert len(data["dietary_rules"]) == 1
    assert len(data["emergency_contacts"]) == 1
    assert data["notification_preferences"]["emergency_call_enabled"] is True


@pytest.mark.asyncio
async def test_cross_family_security_isolation(
    client: AsyncClient, auth_headers_user_a: dict, auth_headers_user_b: dict
):
    """MANDATORY SECURITY TEST:
    Verifies that User B cannot read or modify User A's family, members, allergies, or emergency contacts.
    """
    # 1. User A creates Family A
    fam_a_resp = await client.post(
        "/api/families",
        json={"name": "Family of Alice"},
        headers=auth_headers_user_a,
    )
    assert fam_a_resp.status_code == 201
    family_a_id = fam_a_resp.json()["id"]

    # User A creates a Member with allergy & emergency contact
    mem_a_resp = await client.post(
        f"/api/families/{family_a_id}/members",
        json={"name": "Alice Child", "age": 8, "relationship": "Daughter"},
        headers=auth_headers_user_a,
    )
    assert mem_a_resp.status_code == 201
    member_a_id = mem_a_resp.json()["id"]

    all_a_resp = await client.post(
        f"/api/members/{member_a_id}/allergies",
        json={"name": "Shellfish", "severity": "severe"},
        headers=auth_headers_user_a,
    )
    assert all_a_resp.status_code == 201
    allergy_a_id = all_a_resp.json()["id"]

    ec_a_resp = await client.post(
        f"/api/members/{member_a_id}/emergency-contacts",
        json={"name": "Alice Private Contact", "phone": "+919999999999", "is_primary": True},
        headers=auth_headers_user_a,
    )
    assert ec_a_resp.status_code == 201
    ec_a_id = ec_a_resp.json()["id"]

    # 14 & 15. SECURITY ASSERTIONS:
    # A) User B CANNOT retrieve Family A
    get_fam_b = await client.get(f"/api/families/{family_a_id}", headers=auth_headers_user_b)
    assert get_fam_b.status_code in (403, 404)

    # B) User B CANNOT update Family A
    put_fam_b = await client.put(
        f"/api/families/{family_a_id}",
        json={"name": "Hacked Family Name"},
        headers=auth_headers_user_b,
    )
    assert put_fam_b.status_code in (403, 404)

    # C) User B CANNOT delete Family A
    del_fam_b = await client.delete(f"/api/families/{family_a_id}", headers=auth_headers_user_b)
    assert del_fam_b.status_code in (403, 404)

    # D) User B CANNOT add a member to Family A
    post_mem_b = await client.post(
        f"/api/families/{family_a_id}/members",
        json={"name": "Intruder", "age": 30},
        headers=auth_headers_user_b,
    )
    assert post_mem_b.status_code in (403, 404)

    # E) User B CANNOT retrieve Member A's profile
    get_mem_b = await client.get(f"/api/members/{member_a_id}", headers=auth_headers_user_b)
    assert get_mem_b.status_code in (403, 404)

    # F) User B CANNOT retrieve Family A's member emergency contacts
    get_ec_b = await client.get(
        f"/api/members/{member_a_id}/emergency-contacts",
        headers=auth_headers_user_b,
    )
    assert get_ec_b.status_code in (403, 404)

    # G) User B CANNOT modify Family A's member allergy
    put_all_b = await client.put(
        f"/api/allergies/{allergy_a_id}",
        json={"severity": "mild"},
        headers=auth_headers_user_b,
    )
    assert put_all_b.status_code in (403, 404)

    # H) User B CANNOT delete Family A's member emergency contact
    del_ec_b = await client.delete(f"/api/emergency-contacts/{ec_a_id}", headers=auth_headers_user_b)
    assert del_ec_b.status_code in (403, 404)

    # I) Unauthenticated access must be rejected with 401
    unauth_resp = await client.get(f"/api/families/{family_a_id}")
    assert unauth_resp.status_code == 401
