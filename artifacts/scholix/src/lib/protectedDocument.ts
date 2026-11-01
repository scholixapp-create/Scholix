/**
 * Download through the authenticated API instead of navigating to an unauthed URL.
 * Never put bearer tokens in document URLs or persistent storage.
 */
export function documentPreviewType(bytes: Uint8Array): string | null {
  if (String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function openProtectedDocument(documentId: number, token: string | null): Promise<void> {
  if (!token) throw new Error("Please sign in again before viewing this document.");
  if (!Number.isSafeInteger(documentId) || documentId < 1) throw new Error("Invalid document ID.");
  const tab = window.open("about:blank", "_blank");
  if (!tab) throw new Error("Allow pop-ups for Scholix, then try viewing the document again.");
  tab.opener = null;
  try {
    tab.document.title = "Scholix verification document";
    tab.document.body.textContent = "Loading secure document…";
    const response = await fetch(`/api/admin/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: unknown } | null;
      throw new Error(typeof body?.error === "string" ? body.error : "Unable to open this document. Please try again.");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const type = documentPreviewType(bytes);
    if (!type) throw new Error("This file is not a supported PDF or image. Ask the tutor to upload a valid document.");
    // Do not trust uploaded filenames or Content-Type to render HTML on our origin.
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const explanation = tab.document.createElement("p");
    explanation.textContent = "Scholix verification document. If the preview is unavailable, download the file below.";
    const download = tab.document.createElement("a");
    download.href = url;
    download.download = `scholix-document-${documentId}.${type === "application/pdf" ? "pdf" : type.split("/")[1]}`;
    download.textContent = "Download document";
    const preview = tab.document.createElement(type === "application/pdf" ? "iframe" : "img");
    preview.src = url;
    preview.title = "Verification document preview";
    preview.style.width = "100%";
    preview.style.height = "calc(100vh - 100px)";
    preview.style.display = "block";
    preview.style.objectFit = "contain";
    tab.document.body.style.fontFamily = "system-ui, sans-serif";
    tab.document.body.replaceChildren(explanation, download, preview);
    // Keep the fallback download usable for the entire preview, not just a timer.
    tab.addEventListener("pagehide", () => URL.revokeObjectURL(url), { once: true });
  } catch (error) {
    tab.close();
    throw error;
  }
}
