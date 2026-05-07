export interface DownloadedFile {
  filename: string;
  url: string;
}

export function safeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9_\-. ]/g, "")
    .replace(/\s+/g, "_")
    .trim() || "download";
}

export function downloadBlob(blob: Blob, filename: string): DownloadedFile {
  const url = URL.createObjectURL(blob);
  const safeName = safeFilename(filename);
  const link = document.createElement("a");

  link.href = url;
  link.download = safeName;
  link.rel = "noopener";
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { filename: safeName, url };
}

export function downloadText(filename: string, text: string, type: string): DownloadedFile {
  return downloadBlob(new Blob([text], { type }), filename);
}
