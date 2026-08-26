// Hands the browser a file download for an in-memory blob: create an
// object URL, click a temporary anchor carrying it, then clean up. The
// anchor and the object URL are both discarded in a `finally` so a click()
// failure never leaks either.
export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
