export function clampSummaryToWords(text: string, maxWords: number): string {
  if (!text) return '';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

export function clampSummaryToChars(text: string, minChars: number, maxChars: number): string {
  if (!text) return '';
  if (text.length >= minChars && text.length <= maxChars) return text;
  if (text.length > maxChars) {
    const truncated = text.slice(0, maxChars);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > minChars * 0.8) {
      return truncated.slice(0, lastSpace) + '...';
    }
    return truncated + '...';
  }
  return text;
}

export function exactChars(text: string, targetChars: number): string {
  if (!text) text = '';
  const cleanText = text.trim();
  if (cleanText.length === targetChars) return cleanText;

  if (cleanText.length < targetChars) {
    const padding = targetChars - cleanText.length;
    const filler = ' ';
    return cleanText + filler.repeat(padding);
  }

  const truncated = cleanText.slice(0, targetChars - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > targetChars * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated.slice(0, targetChars - 3) + '...';
}
