import os
import hashlib
import uuid
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

UPLOAD_DIR = Path("uploads/receipts")


class ReceiptImageService:
    """Handles receipt image validation, storage, hashing, and preprocessing for OCR."""

    def __init__(self, base_upload_dir: Optional[Path] = None):
        self.upload_dir = base_upload_dir or UPLOAD_DIR
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def compute_hash(self, image_bytes: bytes) -> str:
        """Computes SHA-256 hash of image bytes for duplicate detection."""
        return hashlib.sha256(image_bytes).hexdigest()

    def save_image(
        self,
        image_bytes: bytes,
        filename: Optional[str] = None,
        receipt_id: Optional[uuid.UUID] = None,
    ) -> Tuple[str, str]:
        """Saves original image to local storage.
        Returns (relative_storage_path, filename).
        """
        r_id = str(receipt_id or uuid.uuid4())
        ext = ".jpg"
        if filename and "." in filename:
            ext = "." + filename.rsplit(".", 1)[-1].lower()
            if ext not in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"]:
                ext = ".jpg"

        saved_filename = f"{r_id}{ext}"
        target_path = self.upload_dir / saved_filename
        with open(target_path, "wb") as f:
            f.write(image_bytes)

        return str(target_path.as_posix()), saved_filename

    def preprocess_for_ocr(self, image_path: str) -> Dict[str, Any]:
        """Preprocesses receipt image for optimal OCR:
        - Grayscale conversion
        - Auto-contrast & brightness normalization
        - Sharpening filter to accentuate small thermal receipt dots
        - Aspect-ratio preserving rescale if too large
        """
        try:
            with Image.open(image_path) as img:
                # 1. Convert to RGB / Grayscale
                gray = img.convert("L")

                # 2. Auto-contrast to maximize text/background separation
                autocontrast = ImageOps.autocontrast(gray, cutoff=2)

                # 3. Enhance contrast
                enhancer = ImageEnhance.Contrast(autocontrast)
                enhanced = enhancer.enhance(1.8)

                # 4. Sharpen
                sharpened = enhanced.filter(ImageFilter.SHARPEN)

                # 5. Rescale if excessively large (> 2400px width/height)
                max_dim = 2400
                w, h = sharpened.size
                if w > max_dim or h > max_dim:
                    scale = min(max_dim / w, max_dim / h)
                    new_size = (int(w * scale), int(h * scale))
                    processed = sharpened.resize(new_size, Image.Resampling.LANCZOS)
                else:
                    processed = sharpened

                # Save preprocessed version next to original
                path_obj = Path(image_path)
                preprocessed_path = path_obj.parent / f"{path_obj.stem}_preprocessed.png"
                processed.save(preprocessed_path, format="PNG")

                return {
                    "success": True,
                    "original_path": image_path,
                    "preprocessed_path": str(preprocessed_path.as_posix()),
                    "width": processed.width,
                    "height": processed.height,
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "original_path": image_path,
                "preprocessed_path": image_path,
            }


# Singleton instance
receipt_image_service = ReceiptImageService()
