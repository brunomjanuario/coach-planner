// Parses a Content-Disposition response header into a safe download
// filename. The header is server-controlled but still untrusted input from
// the browser's perspective: only the final path segment of whatever it
// names is ever used, so a crafted header can't suggest a traversal path.

const FILENAME_STAR = /filename\*\s*=\s*UTF-8''([^;]+)/i;
const FILENAME_QUOTED = /filename\s*=\s*"([^"]*)"/i;
const FILENAME_BARE = /filename\s*=\s*([^;]+)/i;

function lastPathSegment(name) {
  const trimmed = name.trim();
  const segment = trimmed.split(/[/\\]/).pop().trim();
  return segment;
}

export function filenameFromDisposition(header, fallback) {
  if (!header) return fallback;

  const starMatch = header.match(FILENAME_STAR);
  if (starMatch) {
    try {
      const decoded = decodeURIComponent(starMatch[1].trim());
      const segment = lastPathSegment(decoded);
      if (segment) return segment;
    } catch {
      // malformed percent-encoding — fall through to filename= or fallback
    }
  }

  const quotedMatch = header.match(FILENAME_QUOTED);
  const bareMatch = quotedMatch ? null : header.match(FILENAME_BARE);
  const raw = quotedMatch?.[1] ?? bareMatch?.[1];
  if (raw) {
    const segment = lastPathSegment(raw);
    if (segment) return segment;
  }

  return fallback;
}
