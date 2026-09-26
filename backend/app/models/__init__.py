# Phase 1 Models
from app.models.user import User
from app.models.family import Family
from app.models.family_member import FamilyMember
from app.models.allergy import Allergy
from app.models.dietary_rule import DietaryRule
from app.models.ingredient_exclusion import IngredientExclusion
from app.models.nutrition_preference import NutritionPreference
from app.models.custom_rule import CustomRule
from app.models.emergency_contact import EmergencyContact
from app.models.notification_preference import NotificationPreference
from app.models.family_notification import FamilyNotification

# Phase 2 Models
from app.models.evidence import Evidence
from app.models.ingredient import Ingredient
from app.models.ingredient_alias import IngredientAlias
from app.models.ingredient_category import IngredientCategory, IngredientCategoryMap
from app.models.allergen_knowledge import AllergenKnowledge, IngredientAllergenMap
from app.models.dietary_property import DietaryProperty, IngredientDietaryMap
from app.models.ingredient_relationship import IngredientRelationship
from app.models.ingredient_source import IngredientSource

# Phase 3 Models
from app.models.brand import Brand
from app.models.product_category import ProductCategory
from app.models.product import Product
from app.models.product_identifier import ProductIdentifier
from app.models.product_ingredient import ProductIngredient
from app.models.product_allergen_statement import ProductAllergenStatement
from app.models.product_data_source import ProductDataSource
from app.models.product_alternative import ProductAlternative

# Phase 5 Models
from app.models.receipt import Receipt
from app.models.receipt_item import ReceiptItem
from app.models.receipt_processing_event import ReceiptProcessingEvent

# Phase 6 Models
from app.models.risk_analysis import RiskAnalysis
from app.models.risk_finding import RiskFinding
from app.models.risk_finding_path import RiskFindingPath
from app.models.risk_finding_evidence import RiskFindingEvidence

# Phase 8 Models
from app.models.historical_risk_snapshot import HistoricalRiskSnapshot
from app.models.product_purchase_history import ProductPurchaseHistory
from app.models.family_trend_snapshot import FamilyTrendSnapshot
from app.models.member_trend_event import MemberTrendEvent

__all__ = [
    # Phase 1
    "User",
    "Family",
    "FamilyMember",
    "Allergy",
    "DietaryRule",
    "IngredientExclusion",
    "NutritionPreference",
    "CustomRule",
    "EmergencyContact",
    "NotificationPreference",
    "FamilyNotification",
    # Phase 2
    "Evidence",
    "Ingredient",
    "IngredientAlias",
    "IngredientCategory",
    "IngredientCategoryMap",
    "AllergenKnowledge",
    "IngredientAllergenMap",
    "DietaryProperty",
    "IngredientDietaryMap",
    "IngredientRelationship",
    "IngredientSource",
    # Phase 3
    "Brand",
    "ProductCategory",
    "Product",
    "ProductIdentifier",
    "ProductIngredient",
    "ProductAllergenStatement",
    "ProductDataSource",
    # Phase 5
    "Receipt",
    "ReceiptItem",
    "ReceiptProcessingEvent",
    # Phase 6
    "RiskAnalysis",
    "RiskFinding",
    "RiskFindingPath",
    "RiskFindingEvidence",
    # Phase 8
    "HistoricalRiskSnapshot",
    "ProductPurchaseHistory",
    "FamilyTrendSnapshot",
    "MemberTrendEvent",
]

