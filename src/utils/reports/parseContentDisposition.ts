export function parseContentDispositionFilename(disposition: string | null | undefined): string {
  if (!disposition || typeof disposition !== "string") return "report";

  const utf8 = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }

  const quoted = /filename="([^"]+)"/i.exec(disposition);
  if (quoted?.[1]) return quoted[1].trim();

  const plain = /filename=([^;\n]+)/i.exec(disposition);
  if (plain?.[1]) return plain[1].trim().replace(/^"|"$/g, "");

  return "report";
}
