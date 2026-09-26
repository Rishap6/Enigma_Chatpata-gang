import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine, AsyncSessionLocal
from app.models.evidence import Evidence
from app.models.ingredient import Ingredient
from app.models.ingredient_alias import IngredientAlias
from app.models.ingredient_category import IngredientCategory, IngredientCategoryMap
from app.models.allergen_knowledge import AllergenKnowledge, IngredientAllergenMap
from app.models.dietary_property import DietaryProperty, IngredientDietaryMap
from app.models.ingredient_relationship import IngredientRelationship
from app.models.ingredient_source import IngredientSource
from app.engines.ingredient_normalization import normalize_text


async def seed_ingredient_knowledge(db: AsyncSession):
    print("Seeding Ingredient Intelligence Knowledge Base...")

    # 1. Seed Evidence
    curated_evidence = (
        await db.execute(select(Evidence).where(Evidence.source_name == "Curated Development Dataset"))
    ).scalars().first()
    if not curated_evidence:
        curated_evidence = Evidence(
            source_name="Curated Development Dataset",
            source_type="curated_dataset",
            reference="Food Ingredient & Allergen Intelligence Standards",
            description="Phase 2 curated baseline taxonomy and derivation graph",
            evidence_level="high",
        )
        db.add(curated_evidence)
        await db.flush()

    # 2. Seed Categories
    category_names = [
        ("Dairy", "Milk and dairy products"),
        ("Milk-derived", "Components isolated or fractionated from milk"),
        ("Wheat", "Cereal grain from Triticum species"),
        ("Gluten", "Storage proteins found in wheat, barley, rye"),
        ("Nut", "Tree nuts and botanical nuts"),
        ("Peanut", "Legume allergen commonly categorized with nuts"),
        ("Soy", "Soybean and soy derivatives"),
        ("Egg", "Poultry egg and egg fractions"),
        ("Fish", "Finfish allergens"),
        ("Shellfish", "Crustaceans and molluscs"),
        ("Animal-derived", "Ingredients obtained from animal tissue or slaughter"),
        ("Plant-derived", "Ingredients obtained from plants"),
        ("Emulsifier", "Substances that stabilize emulsions"),
        ("Sweetener", "Nutritive and non-nutritive sweetening agents"),
        ("Preservative", "Additives that prevent microbial or chemical degradation"),
        ("Mineral", "Inorganic dietary minerals"),
        ("Cereal", "Grains, flours, and cereal derivatives"),
        ("Oil & Fat", "Edible vegetable oils and lipids"),
        ("Spice & Condiment", "Herbs, spices, and seasoning blends"),
        ("Flavouring", "Natural and nature-identical flavouring compounds"),
        ("Acidity Regulator", "Food-grade organic acids and acidity regulators"),
        ("Food Colour", "Natural and permitted synthetic food colorants"),
        ("Flavour Enhancer", "Umami and flavor enhancing compounds"),
        ("Leavening Agent", "Baking soda, ammonium bicarbonate, and raising agents"),
    ]
    categories: dict[str, IngredientCategory] = {}
    for name, desc in category_names:
        cat = (await db.execute(select(IngredientCategory).where(IngredientCategory.name == name))).scalars().first()
        if not cat:
            cat = IngredientCategory(name=name, description=desc)
            db.add(cat)
            await db.flush()
        categories[name] = cat

    # 3. Seed Allergens (Knowledge base)
    allergen_names = [
        ("Milk", "Bovine milk and dairy proteins (casein, whey)"),
        ("Tree Nut", "Almonds, walnuts, cashews, hazelnuts, etc."),
        ("Peanut", "Peanut proteins (Ara h 1, Ara h 2, etc.)"),
        ("Egg", "Egg proteins (ovalbumin, ovomucoid, etc.)"),
        ("Wheat", "Wheat proteins causing IgE or celiac sensitivity"),
        ("Soy", "Soybean proteins"),
        ("Fish", "Finfish allergens (parvalbumin)"),
        ("Shellfish", "Crustacean (tropomyosin) and molluscan allergens"),
        ("Sesame", "Sesame seed proteins"),
    ]
    allergens: dict[str, AllergenKnowledge] = {}
    for name, desc in allergen_names:
        al = (await db.execute(select(AllergenKnowledge).where(AllergenKnowledge.name == name))).scalars().first()
        if not al:
            al = AllergenKnowledge(name=name, description=desc)
            db.add(al)
            await db.flush()
        allergens[name] = al

    # 4. Seed Dietary Properties
    dietary_names = [
        ("Vegetarian-Compatible", "Permissible in vegetarian diets"),
        ("Vegan-Compatible", "Permissible in vegan diets (no animal or milk products)"),
        ("Gluten-Free-Compatible", "Free from gluten proteins"),
        ("Dairy-Free-Compatible", "Free from milk and dairy ingredients"),
        ("Animal-Derived", "Directly derived from animal tissue, bone, or fat"),
        ("Plant-Derived", "Derived directly from plant sources"),
    ]
    dietary_props: dict[str, DietaryProperty] = {}
    for name, desc in dietary_names:
        dp = (await db.execute(select(DietaryProperty).where(DietaryProperty.name == name))).scalars().first()
        if not dp:
            dp = DietaryProperty(name=name, description=desc)
            db.add(dp)
            await db.flush()
        dietary_props[name] = dp

    # 5. Helper function to create or get Ingredient
    ingredients: dict[str, Ingredient] = {}

    async def get_or_create_ing(canonical: str, display: str, ing_type: str, desc: str = "") -> Ingredient:
        clean_can = canonical.lower().strip()
        ing = (await db.execute(select(Ingredient).where(Ingredient.canonical_name == clean_can))).scalars().first()
        if not ing:
            ing = Ingredient(
                canonical_name=clean_can,
                display_name=display,
                ingredient_type=ing_type,
                description=desc,
                is_active=True,
            )
            db.add(ing)
            await db.flush()
        ingredients[clean_can] = ing
        return ing

    async def add_alias(ing: Ingredient, alias: str, alias_type: str = "common_name"):
        norm_al = normalize_text(alias)
        existing = (
            await db.execute(
                select(IngredientAlias).where(
                    IngredientAlias.ingredient_id == ing.id,
                    IngredientAlias.alias_normalized == norm_al,
                )
            )
        ).scalars().first()
        if not existing:
            db.add(
                IngredientAlias(
                    ingredient_id=ing.id,
                    alias=alias,
                    alias_normalized=norm_al,
                    alias_type=alias_type,
                )
            )

    async def map_category(ing: Ingredient, cat_name: str, confidence: float = 1.0):
        cat = categories.get(cat_name)
        if not cat:
            return
        existing = (
            await db.execute(
                select(IngredientCategoryMap).where(
                    IngredientCategoryMap.ingredient_id == ing.id,
                    IngredientCategoryMap.category_id == cat.id,
                )
            )
        ).scalars().first()
        if not existing:
            db.add(
                IngredientCategoryMap(
                    ingredient_id=ing.id,
                    category_id=cat.id,
                    confidence=confidence,
                    evidence_id=curated_evidence.id,
                )
            )

    async def map_allergen(ing: Ingredient, allergen_name: str, rel_type: str = "contains", confidence: float = 1.0):
        al = allergens.get(allergen_name)
        if not al:
            return
        existing = (
            await db.execute(
                select(IngredientAllergenMap).where(
                    IngredientAllergenMap.ingredient_id == ing.id,
                    IngredientAllergenMap.allergen_id == al.id,
                    IngredientAllergenMap.relationship_type == rel_type,
                )
            )
        ).scalars().first()
        if not existing:
            db.add(
                IngredientAllergenMap(
                    ingredient_id=ing.id,
                    allergen_id=al.id,
                    relationship_type=rel_type,
                    confidence=confidence,
                    evidence_id=curated_evidence.id,
                )
            )

    async def map_dietary(ing: Ingredient, prop_name: str, status: str, confidence: float = 1.0):
        dp = dietary_props.get(prop_name)
        if not dp:
            return
        existing = (
            await db.execute(
                select(IngredientDietaryMap).where(
                    IngredientDietaryMap.ingredient_id == ing.id,
                    IngredientDietaryMap.dietary_property_id == dp.id,
                )
            )
        ).scalars().first()
        if not existing:
            db.add(
                IngredientDietaryMap(
                    ingredient_id=ing.id,
                    dietary_property_id=dp.id,
                    status=status,
                    confidence=confidence,
                    evidence_id=curated_evidence.id,
                )
            )

    async def add_relationship(source_ing: Ingredient, rel_type: str, target_ing: Ingredient, confidence: float = 1.0, notes: str = None):
        existing = (
            await db.execute(
                select(IngredientRelationship).where(
                    IngredientRelationship.source_ingredient_id == source_ing.id,
                    IngredientRelationship.relationship_type == rel_type,
                    IngredientRelationship.target_ingredient_id == target_ing.id,
                )
            )
        ).scalars().first()
        if not existing:
            db.add(
                IngredientRelationship(
                    source_ingredient_id=source_ing.id,
                    relationship_type=rel_type,
                    target_ingredient_id=target_ing.id,
                    confidence=confidence,
                    evidence_id=curated_evidence.id,
                    notes=notes,
                )
            )

    async def add_source(ing: Ingredient, src_type: str, src_status: str, desc: str = None, confidence: float = 1.0):
        existing = (
            await db.execute(
                select(IngredientSource).where(
                    IngredientSource.ingredient_id == ing.id,
                    IngredientSource.source_type == src_type,
                    IngredientSource.source_status == src_status,
                )
            )
        ).scalars().first()
        if not existing:
            db.add(
                IngredientSource(
                    ingredient_id=ing.id,
                    source_type=src_type,
                    source_status=src_status,
                    description=desc,
                    confidence=confidence,
                    evidence_id=curated_evidence.id,
                )
            )

    # ----------------------------------------------------
    # SEED 1: DAIRY INGREDIENTS
    # ----------------------------------------------------
    milk = await get_or_create_ing("milk", "Milk", "basic_ingredient", "Mammalian secretion, primarily bovine.")
    await add_alias(milk, "Whole Milk")
    await add_alias(milk, "Cow Milk")
    await map_category(milk, "Dairy")
    await map_allergen(milk, "Milk", "contains", 1.0)
    await add_source(milk, "milk", "known", "Bovine dairy source", 1.0)
    await map_dietary(milk, "Vegetarian-Compatible", "compatible")
    await map_dietary(milk, "Vegan-Compatible", "incompatible")
    await map_dietary(milk, "Dairy-Free-Compatible", "incompatible")

    whey = await get_or_create_ing("whey", "Whey", "derived_ingredient", "Liquid remaining after milk curdles; rich in soluble proteins.")
    await add_alias(whey, "Whey Protein", "label_name")
    await add_alias(whey, "Milk Whey")
    await add_alias(whey, "Whey Concentrate")
    await add_alias(whey, "Whey Protein Isolate")
    await map_category(whey, "Dairy")
    await map_category(whey, "Milk-derived")
    await map_allergen(whey, "Milk", "derived_from", 0.99)
    await add_relationship(whey, "derived_from", milk, 0.99)
    await add_source(whey, "milk", "known", "Milk-derived whey fractions", 0.99)
    await map_dietary(whey, "Vegetarian-Compatible", "compatible")
    await map_dietary(whey, "Vegan-Compatible", "incompatible")
    await map_dietary(whey, "Dairy-Free-Compatible", "incompatible")

    casein = await get_or_create_ing("casein", "Casein", "protein", "Primary family of phosphoproteins found in mammalian milk.")
    await add_alias(casein, "Milk Casein")
    await map_category(casein, "Dairy")
    await map_category(casein, "Milk-derived")
    await map_allergen(casein, "Milk", "derived_from", 0.99)
    await add_relationship(casein, "derived_from", milk, 0.99)
    await add_source(casein, "milk", "known", "Milk-derived casein protein", 0.99)
    await map_dietary(casein, "Vegetarian-Compatible", "compatible")
    await map_dietary(casein, "Vegan-Compatible", "incompatible")

    caseinate = await get_or_create_ing("caseinate", "Caseinate", "derived_ingredient", "Salt of casein protein.")
    await add_relationship(caseinate, "derived_from", casein, 0.99)
    await map_category(caseinate, "Dairy")
    await map_category(caseinate, "Milk-derived")

    sod_caseinate = await get_or_create_ing("sodium_caseinate", "Sodium Caseinate", "additive", "Sodium salt of casein; used as emulsifier and stabilizer.")
    await add_alias(sod_caseinate, "Sodium Caseinate")
    await add_relationship(sod_caseinate, "derived_from", casein, 0.99)
    await map_category(sod_caseinate, "Dairy")
    await map_category(sod_caseinate, "Milk-derived")
    await map_category(sod_caseinate, "Emulsifier")
    await map_allergen(sod_caseinate, "Milk", "derived_from", 0.98)
    await add_source(sod_caseinate, "milk", "known", "Milk-derived casein salt", 0.98)
    await map_dietary(sod_caseinate, "Vegetarian-Compatible", "compatible")
    await map_dietary(sod_caseinate, "Vegan-Compatible", "incompatible")

    milk_solids = await get_or_create_ing("milk_solids", "Milk Solids", "derived_ingredient", "Dried milk components.")
    await add_alias(milk_solids, "Non-fat Milk Solids")
    await add_alias(milk_solids, "Dairy Solids")
    await add_relationship(milk_solids, "derived_from", milk, 1.0)
    await map_category(milk_solids, "Dairy")
    await map_allergen(milk_solids, "Milk", "contains", 1.0)
    await add_source(milk_solids, "milk", "known", "Dairy milk solids", 1.0)

    milk_powder = await get_or_create_ing("milk_powder", "Milk Powder", "derived_ingredient", "Dehydrated milk powder.")
    await add_alias(milk_powder, "Skim Milk Powder")
    await add_alias(milk_powder, "Dry Milk")
    await add_relationship(milk_powder, "derived_from", milk, 1.0)
    await map_category(milk_powder, "Dairy")
    await map_allergen(milk_powder, "Milk", "contains", 1.0)

    butter = await get_or_create_ing("butter", "Butter", "basic_ingredient", "Dairy product made from churned cream.")
    await add_relationship(butter, "derived_from", milk, 1.0)
    await map_category(butter, "Dairy")
    await map_allergen(butter, "Milk", "contains", 0.99)
    await add_source(butter, "milk", "known", "Dairy butterfat", 1.0)

    lactose = await get_or_create_ing("lactose", "Lactose", "sweetener", "Milk sugar disaccharide.")
    await add_alias(lactose, "Milk Sugar")
    await add_relationship(lactose, "derived_from", milk, 0.99)
    await map_category(lactose, "Dairy")
    await map_category(lactose, "Sweetener")
    await map_allergen(lactose, "Milk", "associated_with", 0.95)
    await add_source(lactose, "milk", "known", "Milk-derived lactose sugar", 0.99)

    # ----------------------------------------------------
    # SEED 2: WHEAT / GLUTEN
    # ----------------------------------------------------
    wheat = await get_or_create_ing("wheat", "Wheat", "basic_ingredient", "Cereal grain containing gluten proteins.")
    await map_category(wheat, "Wheat")
    await map_category(wheat, "Gluten")
    await map_allergen(wheat, "Wheat", "contains", 1.0)
    await add_source(wheat, "plant", "known", "Cereal grain Triticum", 1.0)
    await map_dietary(wheat, "Vegetarian-Compatible", "compatible")
    await map_dietary(wheat, "Vegan-Compatible", "compatible")
    await map_dietary(wheat, "Gluten-Free-Compatible", "incompatible")

    wheat_flour = await get_or_create_ing("wheat_flour", "Wheat Flour", "flour", "Milled wheat grain.")
    await add_alias(wheat_flour, "Atta", "regional_name")
    await add_relationship(wheat_flour, "derived_from", wheat, 1.0)
    await map_category(wheat_flour, "Wheat")
    await map_category(wheat_flour, "Gluten")
    await map_allergen(wheat_flour, "Wheat", "contains", 1.0)

    maida = await get_or_create_ing("maida", "Maida", "flour", "Refined all-purpose wheat flour popular in South Asia.")
    await add_alias(maida, "Refined Wheat Flour", "label_name")
    await add_alias(maida, "All-purpose Flour")
    await add_relationship(maida, "derived_from", wheat, 1.0)
    await map_category(maida, "Wheat")
    await map_category(maida, "Gluten")
    await map_allergen(maida, "Wheat", "derived_from", 0.99)
    await add_source(maida, "plant", "known", "Refined wheat endosperm", 1.0)
    await map_dietary(maida, "Gluten-Free-Compatible", "incompatible")

    semolina = await get_or_create_ing("semolina", "Semolina", "flour", "Coarse purified wheat middlings of durum wheat.")
    await add_alias(semolina, "Suji", "regional_name")
    await add_alias(semolina, "Rava", "regional_name")
    await add_alias(semolina, "Sooji", "regional_name")
    await add_relationship(semolina, "derived_from", wheat, 1.0)
    await map_category(semolina, "Wheat")
    await map_category(semolina, "Gluten")
    await map_allergen(semolina, "Wheat", "derived_from", 0.99)

    # ----------------------------------------------------
    # SEED 3: PEANUT
    # ----------------------------------------------------
    peanut = await get_or_create_ing("peanut", "Peanut", "basic_ingredient", "Legume allergen Arachis hypogaea.")
    await add_alias(peanut, "Groundnut", "common_name")
    await add_alias(peanut, "Monkey Nut")
    await map_category(peanut, "Peanut")
    await map_category(peanut, "Nut")
    await map_allergen(peanut, "Peanut", "contains", 1.0)
    await add_source(peanut, "plant", "known", "Legume botanical origin", 1.0)
    await map_dietary(peanut, "Vegetarian-Compatible", "compatible")
    await map_dietary(peanut, "Vegan-Compatible", "compatible")

    peanut_flour = await get_or_create_ing("peanut_flour", "Peanut Flour", "flour", "Defatted peanut meal flour.")
    await add_relationship(peanut_flour, "derived_from", peanut, 1.0)
    await map_category(peanut_flour, "Peanut")
    await map_allergen(peanut_flour, "Peanut", "contains", 1.0)

    peanut_oil = await get_or_create_ing("peanut_oil", "Peanut Oil", "derived_ingredient", "Oil extracted from peanuts.")
    await add_alias(peanut_oil, "Groundnut Oil")
    await add_relationship(peanut_oil, "derived_from", peanut, 1.0)
    await map_category(peanut_oil, "Peanut")
    await map_allergen(peanut_oil, "Peanut", "derived_from", 0.95)

    # ----------------------------------------------------
    # SEED 4: SOY
    # ----------------------------------------------------
    soy = await get_or_create_ing("soy", "Soy", "basic_ingredient", "Soybean Glycine max.")
    await add_alias(soy, "Soybean")
    await add_alias(soy, "Soya")
    await map_category(soy, "Soy")
    await map_allergen(soy, "Soy", "contains", 1.0)
    await add_source(soy, "plant", "known", "Legume Glycine max", 1.0)

    soy_lecithin = await get_or_create_ing("soy_lecithin", "Soy Lecithin", "emulsifier", "Lecithin derived from soybean oil processing.")
    await add_alias(soy_lecithin, "Soya Lecithin")
    await add_relationship(soy_lecithin, "derived_from", soy, 0.99)
    await map_category(soy_lecithin, "Soy")
    await map_category(soy_lecithin, "Emulsifier")
    await map_allergen(soy_lecithin, "Soy", "derived_from", 0.95)
    await add_source(soy_lecithin, "plant", "known", "Soybean oil byproduct", 1.0)

    # ----------------------------------------------------
    # SEED 5: EGG
    # ----------------------------------------------------
    egg = await get_or_create_ing("egg", "Egg", "basic_ingredient", "Poultry egg.")
    await add_alias(egg, "Hen Egg")
    await map_category(egg, "Egg")
    await map_allergen(egg, "Egg", "contains", 1.0)
    await add_source(egg, "egg", "known", "Avian egg origin", 1.0)
    await map_dietary(egg, "Vegetarian-Compatible", "compatible")
    await map_dietary(egg, "Vegan-Compatible", "incompatible")

    egg_white = await get_or_create_ing("egg_white", "Egg White", "basic_ingredient", "Clear liquid contained within an egg.")
    await add_relationship(egg_white, "part_of", egg, 1.0)
    await map_category(egg_white, "Egg")
    await map_allergen(egg_white, "Egg", "contains", 1.0)

    egg_yolk = await get_or_create_ing("egg_yolk", "Egg Yolk", "basic_ingredient", "Yellow nutrient-bearing portion of egg.")
    await add_relationship(egg_yolk, "part_of", egg, 1.0)
    await map_category(egg_yolk, "Egg")
    await map_allergen(egg_yolk, "Egg", "contains", 1.0)

    albumin = await get_or_create_ing("albumin", "Albumin", "protein", "Soluble globular protein derived from egg white or blood serum.")
    await add_relationship(albumin, "derived_from", egg, 0.95)
    await map_category(albumin, "Egg")
    await map_allergen(albumin, "Egg", "derived_from", 0.95)

    # ----------------------------------------------------
    # SEED 6: ANIMAL-DERIVED
    # ----------------------------------------------------
    collagen = await get_or_create_ing("collagen", "Collagen", "protein", "Main structural protein in animal connective tissues.")
    await map_category(collagen, "Animal-derived")
    await add_source(collagen, "animal", "known", "Bovine, porcine, or marine connective tissue", 1.0)
    await map_dietary(collagen, "Animal-Derived", "compatible")
    await map_dietary(collagen, "Vegetarian-Compatible", "incompatible")
    await map_dietary(collagen, "Vegan-Compatible", "incompatible")

    gelatin = await get_or_create_ing("gelatin", "Gelatin", "additive", "Translucent, colorless, flavorless food ingredient derived from collagen.")
    await add_alias(gelatin, "Gelatine")
    await add_relationship(gelatin, "derived_from", collagen, 1.0)
    await map_category(gelatin, "Animal-derived")
    await add_source(gelatin, "animal", "known", "Hydrolyzed animal collagen (skin, bones, cartilege)", 1.0)
    await map_dietary(gelatin, "Animal-Derived", "compatible", 1.0)
    await map_dietary(gelatin, "Vegetarian-Compatible", "incompatible", 1.0)
    await map_dietary(gelatin, "Vegan-Compatible", "incompatible", 1.0)

    # ----------------------------------------------------
    # SEED 7: ADDITIVES & UNCERTAIN SOURCE DEMONSTRATION
    # ----------------------------------------------------
    ins_322 = await get_or_create_ing("ins_322", "Lecithin", "emulsifier", "Naturally occurring fatty substance used as an emulsifier.")
    await add_alias(ins_322, "INS 322", "ins_code")
    await add_alias(ins_322, "E322", "e_number")
    await add_alias(ins_322, "Lecithin", "common_name")
    await map_category(ins_322, "Emulsifier")
    await add_source(ins_322, "plant", "possible", "Often derived from soy, sunflower, or canola", 0.8)
    await add_source(ins_322, "egg", "possible", "May be derived from egg yolk", 0.2)

    # INS 471: CRITICAL UNCERTAIN SOURCE
    ins_471 = await get_or_create_ing("mono_and_diglycerides", "Mono- and Diglycerides", "emulsifier", "Food additive composed of diglycerides and monoglycerides.")
    await add_alias(ins_471, "INS 471", "ins_code")
    await add_alias(ins_471, "ins 471", "ins_code")
    await add_alias(ins_471, "E471", "e_number")
    await add_alias(ins_471, "e471", "e_number")
    await add_alias(ins_471, "471", "abbreviation")
    await add_alias(ins_471, "Mono- and Diglycerides", "common_name")
    await add_alias(ins_471, "Mono and diglycerides", "common_name")
    await add_alias(ins_471, "Monoglycerides")
    await map_category(ins_471, "Emulsifier")
    # Dual sources: can be plant or animal!
    await add_source(ins_471, "plant", "possible", "Derived from vegetable oils (soybean, palm, cottonseed)", 0.5)
    await add_source(ins_471, "animal", "possible", "Derived from animal fats (tallow, lard)", 0.5)
    # Dietary status is UNCERTAIN:
    await map_dietary(ins_471, "Animal-Derived", "uncertain", 0.5)
    await map_dietary(ins_471, "Vegetarian-Compatible", "uncertain", 0.5)
    await map_dietary(ins_471, "Vegan-Compatible", "uncertain", 0.5)

    # ----------------------------------------------------
    # SEED 8: OTHER COMMON INGREDIENTS
    # ----------------------------------------------------
    sugar = await get_or_create_ing("sugar", "Sugar", "sweetener", "Sucrose extracted from sugar cane or sugar beet.")
    await add_alias(sugar, "Sucrose")
    await map_category(sugar, "Sweetener")
    await add_source(sugar, "plant", "known", "Sugar cane / sugar beet", 1.0)
    await map_dietary(sugar, "Vegetarian-Compatible", "compatible")

    glucose = await get_or_create_ing("glucose", "Glucose", "sweetener", "Simple sugar monosaccharide.")
    await add_alias(glucose, "Dextrose")
    await map_category(glucose, "Sweetener")

    fructose = await get_or_create_ing("fructose", "Fructose", "sweetener", "Fruit sugar monosaccharide.")
    await map_category(fructose, "Sweetener")

    salt = await get_or_create_ing("salt", "Salt", "basic_ingredient", "Common dietary salt, primarily sodium chloride.")
    await add_alias(salt, "Sodium Chloride")
    await add_alias(salt, "Table Salt")
    await map_category(salt, "Mineral")
    await add_source(salt, "mineral", "known", "Mined rock salt or evaporated sea salt", 1.0)

    palm_oil = await get_or_create_ing("palm_oil", "Palm Oil", "basic_ingredient", "Edible vegetable oil derived from the mesocarp of the fruit of oil palms.")
    await map_category(palm_oil, "Plant-derived")
    await add_source(palm_oil, "plant", "known", "Oil palm Elaeis guineensis", 1.0)
    await map_dietary(palm_oil, "Vegetarian-Compatible", "compatible")
    await map_dietary(palm_oil, "Vegan-Compatible", "compatible")

    cocoa = await get_or_create_ing("cocoa", "Cocoa", "basic_ingredient", "Solids of roasted and ground cacao beans.")
    await add_alias(cocoa, "Cocoa Powder")
    await map_category(cocoa, "Plant-derived")

    cocoa_butter = await get_or_create_ing("cocoa_butter", "Cocoa Butter", "basic_ingredient", "Pale-yellow, edible fat extracted from the cocoa bean.")
    await add_relationship(cocoa_butter, "derived_from", cocoa, 1.0)
    await map_category(cocoa_butter, "Plant-derived")
    await map_dietary(cocoa_butter, "Vegetarian-Compatible", "compatible")
    await map_dietary(cocoa_butter, "Vegan-Compatible", "compatible")

    # ----------------------------------------------------
    # SEED 9: PACKAGED FOODS & SNACK INGREDIENTS
    # ----------------------------------------------------
    # Cereal & Grains
    cereal = await get_or_create_ing("cereal_products", "Cereal Products", "basic_ingredient", "Processed cereal grain blend.")
    await add_alias(cereal, "Cereal")
    await add_alias(cereal, "Cereal Products")
    await add_alias(cereal, "Cereals")
    await map_category(cereal, "Cereal")
    await map_category(cereal, "Plant-derived")
    await add_source(cereal, "plant", "known", "Grain cereals", 1.0)
    await map_dietary(cereal, "Vegetarian-Compatible", "compatible")
    await map_dietary(cereal, "Vegan-Compatible", "compatible")

    rice_meal = await get_or_create_ing("rice_meal", "Rice Meal", "flour", "Coarsely ground or milled rice grain.")
    await add_alias(rice_meal, "Rice")
    await add_alias(rice_meal, "Rice Flour")
    await add_alias(rice_meal, "Rice Powder")
    await map_category(rice_meal, "Cereal")
    await map_category(rice_meal, "Plant-derived")
    await add_source(rice_meal, "plant", "known", "Oryza sativa grain", 1.0)
    await map_dietary(rice_meal, "Vegetarian-Compatible", "compatible")
    await map_dietary(rice_meal, "Vegan-Compatible", "compatible")
    await map_dietary(rice_meal, "Gluten-Free-Compatible", "compatible")

    corn_meal = await get_or_create_ing("corn_meal", "Corn Meal", "flour", "Meal ground from dried corn (maize).")
    await add_alias(corn_meal, "Corn")
    await add_alias(corn_meal, "Maize Meal")
    await add_alias(corn_meal, "Corn Flour")
    await add_alias(corn_meal, "Corn Starch")
    await add_alias(corn_meal, "Maize Flour")
    await map_category(corn_meal, "Cereal")
    await map_category(corn_meal, "Plant-derived")
    await add_source(corn_meal, "plant", "known", "Zea mays grain", 1.0)
    await map_dietary(corn_meal, "Vegetarian-Compatible", "compatible")
    await map_dietary(corn_meal, "Vegan-Compatible", "compatible")
    await map_dietary(corn_meal, "Gluten-Free-Compatible", "compatible")

    gram_meal = await get_or_create_ing("gram_meal", "Gram Meal", "flour", "Pulse flour made from ground chickpeas / chana dal.")
    await add_alias(gram_meal, "Besan")
    await add_alias(gram_meal, "Chickpea Flour")
    await add_alias(gram_meal, "Gram Flour")
    await add_alias(gram_meal, "Bengal Gram Flour")
    await map_category(gram_meal, "Plant-derived")
    await add_source(gram_meal, "plant", "known", "Cicer arietinum pulse", 1.0)
    await map_dietary(gram_meal, "Vegetarian-Compatible", "compatible")
    await map_dietary(gram_meal, "Vegan-Compatible", "compatible")
    await map_dietary(gram_meal, "Gluten-Free-Compatible", "compatible")

    potato = await get_or_create_ing("potato", "Potato", "basic_ingredient", "Edible tuber Solanum tuberosum.")
    await add_alias(potato, "Potatoes")
    await add_alias(potato, "Potato Flakes")
    await add_alias(potato, "Dehydrated Potato")
    await map_category(potato, "Plant-derived")
    await add_source(potato, "plant", "known", "Solanum tuberosum tuber", 1.0)
    await map_dietary(potato, "Vegetarian-Compatible", "compatible")
    await map_dietary(potato, "Vegan-Compatible", "compatible")

    starch = await get_or_create_ing("starch", "Starch", "basic_ingredient", "Polymeric carbohydrate extracted from plant sources.")
    await add_alias(starch, "Food Starch")
    await add_alias(starch, "Modified Starch")
    await map_category(starch, "Plant-derived")
    await add_source(starch, "plant", "known", "Plant carbohydrate", 1.0)
    await map_dietary(starch, "Vegetarian-Compatible", "compatible")

    # Oils & Fats
    veg_oil = await get_or_create_ing("edible_vegetable_oil", "Edible Vegetable Oil", "basic_ingredient", "Refined plant-derived cooking oil.")
    await add_alias(veg_oil, "Vegetable Oil")
    await add_alias(veg_oil, "Edible Oil")
    await add_alias(veg_oil, "Refined Vegetable Oil")
    await add_alias(veg_oil, "Edible Vegetable Fats")
    await add_alias(veg_oil, "Fractionated Vegetable Fat")
    await map_category(veg_oil, "Oil & Fat")
    await map_category(veg_oil, "Plant-derived")
    await add_source(veg_oil, "plant", "known", "Plant seed/fruit lipid", 1.0)
    await map_dietary(veg_oil, "Vegetarian-Compatible", "compatible")
    await map_dietary(veg_oil, "Vegan-Compatible", "compatible")

    palmolein = await get_or_create_ing("palmolein", "Palmolein Oil", "basic_ingredient", "Liquid fraction obtained by fractionation of palm oil.")
    await add_alias(palmolein, "Palmolein")
    await add_alias(palmolein, "Palmolein Oil")
    await add_alias(palmolein, "Refined Palm Oil")
    await add_alias(palmolein, "Palm Olein")
    await map_category(palmolein, "Oil & Fat")
    await map_category(palmolein, "Plant-derived")
    await add_source(palmolein, "plant", "known", "Elaeis guineensis fraction", 1.0)
    await map_dietary(palmolein, "Vegetarian-Compatible", "compatible")
    await map_dietary(palmolein, "Vegan-Compatible", "compatible")

    rice_bran_oil = await get_or_create_ing("rice_bran_oil", "Rice Bran Oil", "basic_ingredient", "Oil extracted from the hard outer brown layer of rice.")
    await add_alias(rice_bran_oil, "Rice Bran Oil")
    await map_category(rice_bran_oil, "Oil & Fat")
    await map_category(rice_bran_oil, "Plant-derived")
    await add_source(rice_bran_oil, "plant", "known", "Rice bran lipid", 1.0)
    await map_dietary(rice_bran_oil, "Vegetarian-Compatible", "compatible")
    await map_dietary(rice_bran_oil, "Vegan-Compatible", "compatible")

    sunflower_oil = await get_or_create_ing("sunflower_oil", "Sunflower Oil", "basic_ingredient", "Non-volatile oil compressed from the seeds of sunflower.")
    await add_alias(sunflower_oil, "Refined Sunflower Oil")
    await map_category(sunflower_oil, "Oil & Fat")
    await map_category(sunflower_oil, "Plant-derived")
    await add_source(sunflower_oil, "plant", "known", "Helianthus annuus seed", 1.0)
    await map_dietary(sunflower_oil, "Vegetarian-Compatible", "compatible")
    await map_dietary(sunflower_oil, "Vegan-Compatible", "compatible")

    sal_fat = await get_or_create_ing("sal_fat", "Sal Fat", "basic_ingredient", "Vegetable fat extracted from the seeds of Shorea robusta.")
    await add_alias(sal_fat, "Sal Seed Fat")
    await map_category(sal_fat, "Oil & Fat")
    await map_category(sal_fat, "Plant-derived")
    await add_source(sal_fat, "plant", "known", "Shorea robusta seed", 1.0)
    await map_dietary(sal_fat, "Vegetarian-Compatible", "compatible")

    # Seasonings & Spices
    seasoning = await get_or_create_ing("seasoning", "Seasoning", "basic_ingredient", "Culinary seasoning and spice blend.")
    await add_alias(seasoning, "Seasoning Mix")
    await add_alias(seasoning, "Masala")
    await map_category(seasoning, "Spice & Condiment")
    await map_category(seasoning, "Plant-derived")
    await add_source(seasoning, "plant", "known", "Herbs and spice formulation", 1.0)
    await map_dietary(seasoning, "Vegetarian-Compatible", "compatible")

    spices = await get_or_create_ing("spices_and_condiments", "Spices and Condiments", "basic_ingredient", "Aromatic or pungent vegetable substances used to flavor foods.")
    await add_alias(spices, "Spices")
    await add_alias(spices, "Condiments")
    await add_alias(spices, "Mixed Spices")
    await add_alias(spices, "Spice Blend")
    await map_category(spices, "Spice & Condiment")
    await map_category(spices, "Plant-derived")
    await add_source(spices, "plant", "known", "Culinary spices", 1.0)
    await map_dietary(spices, "Vegetarian-Compatible", "compatible")

    iodised_salt = await get_or_create_ing("iodised_salt", "Iodised Salt", "basic_ingredient", "Table salt fortified with essential iodine trace mineral.")
    await add_alias(iodised_salt, "Iodized Salt")
    await add_alias(iodised_salt, "Vacuum Evaporated Salt")
    await map_category(iodised_salt, "Mineral")
    await add_source(iodised_salt, "mineral", "known", "Fortified mineral salt", 1.0)
    await map_dietary(iodised_salt, "Vegetarian-Compatible", "compatible")

    black_salt = await get_or_create_ing("black_salt", "Black Salt", "basic_ingredient", "Kiln-fired Indian rock salt with distinctive pungent sulfurous aroma.")
    await add_alias(black_salt, "Kala Namak")
    await add_alias(black_salt, "Rock Salt")
    await map_category(black_salt, "Mineral")
    await add_source(black_salt, "mineral", "known", "Volcanic/rock mineral salt", 1.0)
    await map_dietary(black_salt, "Vegetarian-Compatible", "compatible")

    tomato_powder = await get_or_create_ing("tomato_powder", "Tomato Powder", "basic_ingredient", "Dehydrated ground tomato pulp.")
    await add_alias(tomato_powder, "Dehydrated Tomato Powder")
    await add_alias(tomato_powder, "Tomato Puree")
    await map_category(tomato_powder, "Plant-derived")
    await add_source(tomato_powder, "plant", "known", "Lycopersicon esculentum", 1.0)
    await map_dietary(tomato_powder, "Vegetarian-Compatible", "compatible")

    # Sweeteners & Carbohydrates
    maltodextrin = await get_or_create_ing("maltodextrin", "Maltodextrin", "sweetener", "Polysaccharide produced from vegetable starch by partial hydrolysis.")
    await add_alias(maltodextrin, "Malto Dextrin")
    await add_alias(maltodextrin, "Corn Maltodextrin")
    await map_category(maltodextrin, "Sweetener")
    await map_category(maltodextrin, "Plant-derived")
    await add_source(maltodextrin, "plant", "known", "Hydrolyzed corn/wheat starch", 1.0)
    await map_dietary(maltodextrin, "Vegetarian-Compatible", "compatible")
    await map_dietary(maltodextrin, "Vegan-Compatible", "compatible")

    liquid_glucose = await get_or_create_ing("liquid_glucose", "Liquid Glucose", "sweetener", "Purified, concentrated aqueous solution of nutritive saccharides.")
    await add_alias(liquid_glucose, "Glucose Syrup")
    await add_alias(liquid_glucose, "Invert Sugar")
    await add_alias(liquid_glucose, "Invert Sugar Syrup")
    await add_alias(liquid_glucose, "Corn Syrup")
    await map_category(liquid_glucose, "Sweetener")
    await map_category(liquid_glucose, "Plant-derived")
    await add_source(liquid_glucose, "plant", "known", "Hydrolyzed plant starch", 1.0)
    await map_dietary(liquid_glucose, "Vegetarian-Compatible", "compatible")

    # Food Additives, Regulators, Flavours & Colours
    acidity_reg = await get_or_create_ing("acidity_regulators", "Acidity Regulators", "additive", "Food additives used to change or maintain pH.")
    await add_alias(acidity_reg, "Acidity Regulator")
    await add_alias(acidity_reg, "INS 330")
    await add_alias(acidity_reg, "Citric Acid")
    await add_alias(acidity_reg, "INS 296")
    await add_alias(acidity_reg, "Malic Acid")
    await add_alias(acidity_reg, "INS 331")
    await add_alias(acidity_reg, "Sodium Citrate")
    await map_category(acidity_reg, "Acidity Regulator")
    await add_source(acidity_reg, "plant", "known", "Fermented citrus/organic acids", 1.0)
    await map_dietary(acidity_reg, "Vegetarian-Compatible", "compatible")

    flavour = await get_or_create_ing("flavour", "Flavour", "additive", "Natural and nature-identical food flavoring substances.")
    await add_alias(flavour, "Flavours")
    await add_alias(flavour, "Flavouring Substances")
    await add_alias(flavour, "Natural and Nature Identical Flavouring Substances")
    await add_alias(flavour, "Nature Identical Flavouring Substances")
    await add_alias(flavour, "Added Flavour")
    await add_alias(flavour, "Artificial Flavouring Substances")
    await add_alias(flavour, "Vanilla")
    await add_alias(flavour, "Coffee")
    await map_category(flavour, "Flavouring")
    await add_source(flavour, "plant", "possible", "Natural botanical extracts or nature-identical synthesis", 0.9)
    await map_dietary(flavour, "Vegetarian-Compatible", "compatible")

    flavour_enhancer = await get_or_create_ing("flavour_enhancers", "Flavour Enhancers", "additive", "Compounds that enhance the existing savory flavor of food.")
    await add_alias(flavour_enhancer, "Flavour Enhancer")
    await add_alias(flavour_enhancer, "INS 627")
    await add_alias(flavour_enhancer, "INS 631")
    await add_alias(flavour_enhancer, "Disodium Guanylate")
    await add_alias(flavour_enhancer, "Disodium Inosinate")
    await map_category(flavour_enhancer, "Flavour Enhancer")
    await add_source(flavour_enhancer, "plant", "possible", "Fermented tapioca/yeast extracts", 0.9)
    await map_dietary(flavour_enhancer, "Vegetarian-Compatible", "compatible")

    food_colour = await get_or_create_ing("food_colour", "Food Colour", "additive", "Permitted natural and synthetic food colorants.")
    await add_alias(food_colour, "Colour")
    await add_alias(food_colour, "INS 160c")
    await add_alias(food_colour, "Paprika Extract")
    await add_alias(food_colour, "INS 150d")
    await add_alias(food_colour, "Caramel")
    await add_alias(food_colour, "Permitted Natural Food Colour")
    await map_category(food_colour, "Food Colour")
    await add_source(food_colour, "plant", "known", "Plant extraction (paprika/caramelized sugar)", 1.0)
    await map_dietary(food_colour, "Vegetarian-Compatible", "compatible")

    hvp = await get_or_create_ing("hydrolysed_vegetable_protein", "Hydrolysed Vegetable Protein", "basic_ingredient", "Protein obtained through the acid/enzymatic hydrolysis of cereal or legume crops.")
    await add_alias(hvp, "Hydrolyzed Vegetable Protein")
    await add_alias(hvp, "HVP")
    await add_alias(hvp, "Soya Protein Hydrolysate")
    await map_category(hvp, "Plant-derived")
    await add_source(hvp, "plant", "known", "Hydrolyzed vegetable protein", 1.0)
    await map_dietary(hvp, "Vegetarian-Compatible", "compatible")

    raising_agent = await get_or_create_ing("raising_agent", "Raising Agent", "additive", "Substance used in baking to produce dough leavening.")
    await add_alias(raising_agent, "Raising Agents")
    await add_alias(raising_agent, "Leavening Agents")
    await add_alias(raising_agent, "500(ii)")
    await add_alias(raising_agent, "503(ii)")
    await add_alias(raising_agent, "INS 500(ii)")
    await add_alias(raising_agent, "INS 503(ii)")
    await add_alias(raising_agent, "Sodium Bicarbonate")
    await add_alias(raising_agent, "Ammonium Bicarbonate")
    await map_category(raising_agent, "Leavening Agent")
    await map_category(raising_agent, "Mineral")
    await add_source(raising_agent, "mineral", "known", "Food-grade carbonate salts", 1.0)
    await map_dietary(raising_agent, "Vegetarian-Compatible", "compatible")

    cocoa_solids = await get_or_create_ing("cocoa_solids", "Cocoa Solids", "basic_ingredient", "Non-fat component of cacao beans after cocoa butter extraction.")
    await add_alias(cocoa_solids, "Cocoa Mass")
    await add_alias(cocoa_solids, "Chocolate Liquor")
    await add_alias(cocoa_solids, "Chocolate Solids")
    await add_relationship(cocoa_solids, "derived_from", cocoa, 1.0)
    await map_category(cocoa_solids, "Plant-derived")
    await add_source(cocoa_solids, "plant", "known", "Theobroma cacao bean", 1.0)
    await map_dietary(cocoa_solids, "Vegetarian-Compatible", "compatible")
    await map_dietary(cocoa_solids, "Vegan-Compatible", "compatible")

    datem = await get_or_create_ing("diacetyl_tartaric_acid_esters", "Diacetyltartaric and Fatty Acid Esters of Glycerol", "emulsifier", "Emulsifier of vegetable origin (INS 472e).")
    await add_alias(datem, "DATEM")
    await add_alias(datem, "INS 472e")
    await add_alias(datem, "Emulsifier of Vegetable Origin")
    await map_category(datem, "Emulsifier")
    await add_source(datem, "plant", "known", "Vegetable fatty acid esters", 1.0)
    await map_dietary(datem, "Vegetarian-Compatible", "compatible")

    await db.commit()
    print("Ingredient Intelligence Knowledge Base seeded successfully!")


if __name__ == "__main__":
    async def main():
        async with AsyncSessionLocal() as session:
            await seed_ingredient_knowledge(session)

    asyncio.run(main())
