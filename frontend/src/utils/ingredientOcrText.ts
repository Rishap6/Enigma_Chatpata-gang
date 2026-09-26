/**
 * Pulls the ingredient declaration out of noisy full-label OCR text.
 */
export function extractIngredientListFromOcr(raw: string): string {
  if (!raw?.trim()) return '';

  let text = raw.replace(/\r/g, '\n').replace(/\s+/g, ' ').trim();

  const blockMatch = text.match(
    /ingredients?\s*[:\-]?\s*(.+?)(?:\ballergen\b|\bcontains\b|\bmay contain\b|\bnutrition\b|\bstore\b|\bbest before\b|$)/i
  );
  if (blockMatch?.[1]) {
    return blockMatch[1].trim();
  }

  const lineMatch = raw.match(/ingredients?\s*[:\-]?\s*([^\n]+)/i);
  if (lineMatch?.[1]) {
    return lineMatch[1].trim();
  }

  if (text.includes(',') && text.length > 15) {
    return text;
  }

  return text;
}
