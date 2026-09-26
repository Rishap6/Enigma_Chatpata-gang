import asyncio
import httpx

BASE_URL = "http://127.0.0.1:8000"

async def run_live_journey():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        print("\n--- 1. Testing /health endpoint ---")
        health = await client.get("/health")
        print(f"Health Response ({health.status_code}):", health.json())
        assert health.status_code == 200

        print("\n--- 2. Authenticating as Demo User ---")
        auth_resp = await client.post("/api/auth/demo-login?user_type=demo")
        print(f"Auth Response ({auth_resp.status_code})")
        token = auth_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        print("\n--- 3. Creating Family: 'My Family' ---")
        fam_resp = await client.post("/api/families", json={"name": "My Family"}, headers=headers)
        print(f"Create Family ({fam_resp.status_code}):", fam_resp.json()["name"])
        family_id = fam_resp.json()["id"]

        print("\n--- 4. Creating Member: Father (Age 52) ---")
        mem_resp = await client.post(
            f"/api/families/{family_id}/members",
            json={"name": "Father", "age": 52, "relationship": "Father"},
            headers=headers
        )
        print(f"Create Member ({mem_resp.status_code}):", mem_resp.json()["name"])
        father_id = mem_resp.json()["id"]

        print("\n--- 5. Adding Allergy: Peanut (Severe) ---")
        all_resp = await client.post(
            f"/api/members/{father_id}/allergies",
            json={"name": "Peanut", "severity": "severe", "notes": "Carries EpiPen"},
            headers=headers
        )
        print(f"Add Allergy ({all_resp.status_code}):", all_resp.json()["name"], all_resp.json()["severity"])
        allergy_id = all_resp.json()["id"]

        print("\n--- 6. Adding Dietary Restriction: Vegetarian ---")
        diet_resp = await client.post(
            f"/api/members/{father_id}/dietary-rules",
            json={"rule_type": "dietary", "rule_value": "vegetarian", "label": "Vegetarian"},
            headers=headers
        )
        print(f"Add Dietary Rule ({diet_resp.status_code}):", diet_resp.json()["label"])

        print("\n--- 7. Adding Ingredient Exclusion: Gelatin ---")
        excl_resp = await client.post(
            f"/api/members/{father_id}/ingredient-exclusions",
            json={"ingredient_name": "Gelatin", "reason": "Personal preference"},
            headers=headers
        )
        print(f"Add Exclusion ({excl_resp.status_code}):", excl_resp.json()["ingredient_name"])

        print("\n--- 8. Adding Preference: Reduce Sodium ---")
        pref_resp = await client.post(
            f"/api/members/{father_id}/nutrition-preferences",
            json={"preference_type": "reduce_sodium", "preference_value": "true"},
            headers=headers
        )
        print(f"Add Preference ({pref_resp.status_code}):", pref_resp.json()["preference_type"])

        print("\n--- 9. Adding Custom Rule: 'Avoid products containing onion or garlic.' ---")
        rule_resp = await client.post(
            f"/api/members/{father_id}/custom-rules",
            json={"rule_text": "Avoid products containing onion or garlic."},
            headers=headers
        )
        print(f"Add Custom Rule ({rule_resp.status_code}):", rule_resp.json()["rule_text"])

        print("\n--- 10. Adding Emergency Contact: Mother (Primary) ---")
        ec_resp = await client.post(
            f"/api/members/{father_id}/emergency-contacts",
            json={
                "name": "Mother",
                "phone": "+919876543210",
                "whatsapp_number": "+919876543210",
                "relationship": "Mother",
                "is_primary": True
            },
            headers=headers
        )
        print(f"Add Contact ({ec_resp.status_code}):", ec_resp.json()["name"], "Primary:", ec_resp.json()["is_primary"])

        print("\n--- 11. Updating Notification Channels: In-app & Emergency call enabled ---")
        notif_resp = await client.put(
            f"/api/members/{father_id}/notification-preferences",
            json={"in_app_enabled": True, "push_enabled": True, "emergency_call_enabled": True, "whatsapp_enabled": False},
            headers=headers
        )
        print(f"Notification Preferences ({notif_resp.status_code}):", notif_resp.json())

        print("\n--- 12. Fetching Father Complete Profile ---")
        full_father = await client.get(f"/api/members/{father_id}", headers=headers)
        f_data = full_father.json()
        print(f"Father Profile: Name={f_data['name']}, Allergies={len(f_data['allergies'])}, Dietary={len(f_data['dietary_rules'])}, Exclusions={len(f_data['ingredient_exclusions'])}, Preferences={len(f_data['nutrition_preferences'])}, Rules={len(f_data['custom_rules'])}, Contacts={len(f_data['emergency_contacts'])}")
        assert f_data["allergies"][0]["severity"] == "severe"

        print("\n--- 13. Updating Allergy Severity: Severe -> Moderate ---")
        up_all = await client.put(
            f"/api/allergies/{allergy_id}",
            json={"severity": "moderate"},
            headers=headers
        )
        print(f"Updated Allergy ({up_all.status_code}):", up_all.json()["severity"])
        assert up_all.json()["severity"] == "moderate"

        print("\n--- 14. Refetching Profile to confirm persistence ---")
        refetch_father = await client.get(f"/api/members/{father_id}", headers=headers)
        assert refetch_father.json()["allergies"][0]["severity"] == "moderate"
        print("Persistence verified: Severity is now 'moderate'!")

        print("\n--- 15. Adding Second Member: Child (Age 10) ---")
        child_resp = await client.post(
            f"/api/families/{family_id}/members",
            json={"name": "Child", "age": 10, "relationship": "Child"},
            headers=headers
        )
        child_id = child_resp.json()["id"]
        print(f"Second Member Created: {child_resp.json()['name']} (ID: {child_id})")

        print("\n--- 16. Verifying Both Members on Family ---")
        members_resp = await client.get(f"/api/families/{family_id}/members", headers=headers)
        member_names = [m["name"] for m in members_resp.json()]
        print(f"Members in Family ({len(member_names)}): {member_names}")
        assert "Father" in member_names
        assert "Child" in member_names

        print("\n--- 17. Deleting Second Member (Child) ---")
        del_resp = await client.delete(f"/api/members/{child_id}", headers=headers)
        print(f"Delete Child Response ({del_resp.status_code})")
        assert del_resp.status_code == 204

        print("\n--- 18. Verifying Child is deleted and Father remains ---")
        remaining_resp = await client.get(f"/api/families/{family_id}/members", headers=headers)
        remaining_names = [m["name"] for m in remaining_resp.json()]
        print(f"Remaining Members ({len(remaining_names)}): {remaining_names}")
        assert "Father" in remaining_names
        assert "Child" not in remaining_names

        print("\n--- 19. Future Engine Format Verification ---")
        future_resp = await client.get(f"/api/members/{father_id}/future-requirements", headers=headers)
        print("Future Engine Export Format:", future_resp.json())
        assert future_resp.json()["allergies"][0]["name"] == "Peanut"
        assert "vegetarian" in future_resp.json()["dietary_rules"]

        print("\n==============================================")
        print("ALL 19 STEPS OF PHASE 1 USER JOURNEY PASSED LIVE!")
        print("==============================================")

if __name__ == "__main__":
    asyncio.run(run_live_journey())
