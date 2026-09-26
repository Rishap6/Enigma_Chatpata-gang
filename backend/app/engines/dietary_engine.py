import uuid
from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ingredient import Ingredient
from app.models.dietary_property import IngredientDietaryMap, DietaryProperty
from app.models.ingredient_source import IngredientSource


async def get_dietary_properties(db: AsyncSession, ingredient_id: uuid.UUID) -> Dict[str, Any]:
    """Evaluates dietary properties and compatibility (vegetarian, vegan, gluten-free, dairy-free).
    Correctly retains uncertainty when ingredient origin varies (e.g. INS 471).
    """
    # 1. Fetch direct dietary property mappings
    stmt = (
        select(IngredientDietaryMap)
        .options(
            selectinload(IngredientDietaryMap.dietary_property),
            selectinload(IngredientDietaryMap.evidence),
        )
        .where(IngredientDietaryMap.ingredient_id == ingredient_id)
    )
    dietary_maps = (await db.execute(stmt)).scalars().all()

    properties_list: List[Dict[str, Any]] = []
    prop_dict: Dict[str, str] = {}

    for dm in dietary_maps:
        if dm.dietary_property:
            prop_name = dm.dietary_property.name
            properties_list.append({
                "property_id": dm.dietary_property.id,
                "name": prop_name,
                "status": dm.status,  # compatible, incompatible, uncertain
                "confidence": float(dm.confidence),
                "evidence": dm.evidence.source_name if dm.evidence else None,
            })
            prop_dict[prop_name.lower()] = dm.status

    # 2. Check source for animal vs plant vs milk
    stmt_sources = (
        select(IngredientSource).where(IngredientSource.ingredient_id == ingredient_id)
    )
    sources = (await db.execute(stmt_sources)).scalars().all()
    source_types = [s.source_type.lower() for s in sources]
    source_statuses = [s.source_status.lower() for s in sources]

    # Synthesize dietary summary
    # Check vegetarian compatibility
    if "vegetarian-compatible" in prop_dict:
        veg_status = prop_dict["vegetarian-compatible"]
    elif "animal" in source_types and "plant" in source_types:
        veg_status = "uncertain"
    elif "animal" in source_types and any(s == "known" for s in source_statuses):
        veg_status = "incompatible"
    elif "animal-derived" in prop_dict and prop_dict["animal-derived"] == "compatible":
        veg_status = "incompatible"
    elif "plant" in source_types or "milk" in source_types:
        veg_status = "compatible"
    else:
        veg_status = "unknown"

    # Check vegan compatibility
    if "vegan-compatible" in prop_dict:
        vegan_status = prop_dict["vegan-compatible"]
    elif "animal" in source_types or "milk" in source_types or "egg" in source_types:
        vegan_status = "incompatible" if any(s == "known" for s in source_statuses) else "uncertain"
    elif "plant" in source_types and not ("animal" in source_types or "milk" in source_types):
        vegan_status = "compatible"
    else:
        vegan_status = "uncertain" if "animal" in source_types else "unknown"

    # Animal derived status
    if "animal-derived" in prop_dict:
        status_val = prop_dict["animal-derived"]
        if status_val == "compatible":
            animal_derived_status = "known_animal"
        elif status_val == "incompatible":
            animal_derived_status = "not_animal"
        else:
            animal_derived_status = "uncertain"
    elif "animal" in source_types and any(s == "known" for s in source_statuses):
        animal_derived_status = "known_animal"
    elif "animal" in source_types and "plant" in source_types:
        animal_derived_status = "uncertain"
    elif "plant" in source_types or "mineral" in source_types:
        animal_derived_status = "not_animal"
    else:
        animal_derived_status = "not_animal"

    return {
        "properties": properties_list,
        "summary": {
            "animal_derived": animal_derived_status,
            "vegetarian_compatible": veg_status,
            "vegan_compatible": vegan_status,
            "status": "uncertain" if (veg_status == "uncertain" or vegan_status == "uncertain") else "known",
        },
    }
