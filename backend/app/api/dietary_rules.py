import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.dietary_rule import DietaryRuleCreate, DietaryRuleResponse
from app.services.dietary_rule_service import DietaryRuleService

router = APIRouter(tags=["Dietary Rules"])


@router.post(
    "/members/{member_id}/dietary-rules",
    response_model=DietaryRuleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_dietary_rule(
    member_id: uuid.UUID,
    rule_in: DietaryRuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a structured dietary restriction rule for a member."""
    rule = await DietaryRuleService.add_dietary_rule(db, current_user.id, member_id, rule_in)
    return DietaryRuleResponse.model_validate(rule)


@router.get("/members/{member_id}/dietary-rules", response_model=List[DietaryRuleResponse])
async def list_member_dietary_rules(
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all dietary rules for a member."""
    rules = await DietaryRuleService.get_member_dietary_rules(db, current_user.id, member_id)
    return [DietaryRuleResponse.model_validate(r) for r in rules]


@router.delete("/dietary-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dietary_rule(
    rule_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a dietary rule."""
    await DietaryRuleService.delete_dietary_rule(db, current_user.id, rule_id)
    return None
