import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.receipt_service import receipt_service
from app.schemas.receipt import (
    ReceiptResponse,
    ReceiptListResponse,
    ReceiptItemResponse,
    ReceiptItemUpdateRequest,
    ReceiptItemResolveRequest,
    ReceiptItemBarcodeResolveRequest,
    ReceiptManualItemCreateRequest,
    ReceiptAnalysisResponse,
)

router = APIRouter(prefix="/receipts", tags=["Receipt Intelligence"])


@router.post("", response_model=ReceiptResponse, status_code=status.HTTP_201_CREATED)
async def upload_receipt(
    file: UploadFile = File(...),
    family_id: Optional[uuid.UUID] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Uploads a receipt image and stores it for processing."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    receipt = await receipt_service.create_receipt(
        db,
        owner_user_id=current_user.id,
        family_id=family_id,
        file_bytes=file_bytes,
        filename=file.filename,
    )

    resp = await receipt_service.get_receipt(db, receipt.id, current_user.id)
    if not resp:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load receipt")
    return resp


@router.get("", response_model=ReceiptListResponse)
async def list_receipts(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    family_id: Optional[uuid.UUID] = Query(None, description="Optional family filter"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns paginated grocery receipts belonging to the authenticated user."""
    return await receipt_service.list_receipts(
        db,
        owner_user_id=current_user.id,
        family_id=family_id,
        page=page,
        page_size=page_size,
    )


@router.get("/{receipt_id}", response_model=ReceiptResponse)
async def get_receipt(
    receipt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full details of a receipt including items, candidate products, and events."""
    resp = await receipt_service.get_receipt(db, receipt_id, current_user.id)
    if not resp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found or unauthorized access",
        )
    return resp


@router.get("/{receipt_id}/items", response_model=List[ReceiptItemResponse])
async def get_receipt_items(
    receipt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists line items for a receipt."""
    receipt = await receipt_service.get_receipt(db, receipt_id, current_user.id)
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found or unauthorized access",
        )
    return receipt.items


@router.post("/{receipt_id}/process", response_model=ReceiptResponse)
async def process_receipt(
    receipt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Executes or retries the OCR extraction, line segmentation, and Phase 3 product matching pipeline."""
    try:
        await receipt_service.process_receipt(db, receipt_id, current_user.id)
        resp = await receipt_service.get_receipt(db, receipt_id, current_user.id)
        if not resp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
        return resp
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Processing failed: {str(e)}")


@router.get("/{receipt_id}/analysis", response_model=ReceiptAnalysisResponse)
async def get_receipt_analysis(
    receipt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns structured grocery purchase intelligence dataset ready for Phase 6 Family Risk Engine."""
    try:
        return await receipt_service.get_receipt_analysis(db, receipt_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/items/{item_id}", response_model=ReceiptItemResponse)
async def update_receipt_item(
    item_id: uuid.UUID,
    update_req: ReceiptItemUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Updates product name, quantity, or price for a receipt line item."""
    try:
        return await receipt_service.update_receipt_item(
            db,
            item_id=item_id,
            owner_user_id=current_user.id,
            product_name_raw=update_req.product_name_raw,
            quantity=update_req.quantity,
            unit_price=update_req.unit_price,
            total_price=update_req.total_price,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/items/{item_id}")
async def delete_receipt_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deletes an erroneous OCR line item from a receipt."""
    try:
        await receipt_service.delete_receipt_item(db, item_id, current_user.id)
        return {"success": True, "deleted": True, "message": "Receipt item removed"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/items/{item_id}/resolve-product", response_model=ReceiptItemResponse)
async def resolve_receipt_item_product(
    item_id: uuid.UUID,
    resolve_req: ReceiptItemResolveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Assigns an identified catalog product to an ambiguous or unknown receipt item."""
    try:
        return await receipt_service.resolve_receipt_item_product(
            db,
            item_id=item_id,
            product_id=resolve_req.product_id,
            owner_user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/items/{item_id}/resolve-barcode", response_model=ReceiptItemResponse)
async def resolve_receipt_item_barcode(
    item_id: uuid.UUID,
    resolve_req: ReceiptItemBarcodeResolveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resolves an item using live barcode scanning or manual barcode input (Phase 4 integration)."""
    try:
        return await receipt_service.resolve_receipt_item_barcode(
            db,
            item_id=item_id,
            identifier_type=resolve_req.identifier_type,
            identifier_value=resolve_req.identifier_value,
            owner_user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{receipt_id}/items/manual", response_model=ReceiptItemResponse, status_code=status.HTTP_201_CREATED)
@router.post("/{receipt_id}/manual-item", response_model=ReceiptItemResponse, status_code=status.HTTP_201_CREATED)
async def add_manual_item(
    receipt_id: uuid.UUID,
    item_req: ReceiptManualItemCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Adds a grocery line item manually and matches it against the catalog."""
    try:
        return await receipt_service.add_manual_item(
            db,
            receipt_id=receipt_id,
            owner_user_id=current_user.id,
            product_name=item_req.product_name,
            quantity=item_req.quantity or 1.0,
            price=item_req.price,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{receipt_id}/image")
async def get_receipt_image(
    receipt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Securely streams the receipt image to the owner."""
    receipt = await receipt_service.get_receipt(db, receipt_id, current_user.id)
    if not receipt or not receipt.storage_path or not os.path.exists(receipt.storage_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    return FileResponse(receipt.storage_path)
