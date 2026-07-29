export function formatImageSrc(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // If already a full HTTP/HTTPS URL, relative path, blob URL, or data URL
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  // Detect mime type for raw base64
  let mimeType = "image/png";
  if (trimmed.startsWith("/9j/")) {
    mimeType = "image/jpeg";
  } else if (trimmed.startsWith("iVBORw")) {
    mimeType = "image/png";
  } else if (trimmed.startsWith("R0lGOD")) {
    mimeType = "image/gif";
  } else if (trimmed.startsWith("UklGR")) {
    mimeType = "image/webp";
  } else if (trimmed.startsWith("PHN2Zy")) {
    mimeType = "image/svg+xml";
  }

  return `data:${mimeType};base64,${trimmed}`;
}
