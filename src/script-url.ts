const SCRIPT_MARKER = 'rediads-renderer';

/**
 * Resolves the CDN URL for the renderer bundle from the executing script tag.
 * Falls back to the last matching <script> on the page.
 */
export function detectScriptUrl(): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const current = document.currentScript as HTMLScriptElement | null;
  if (current?.src && isRendererScript(current.src)) {
    return current.src;
  }

  const scripts = document.querySelectorAll<HTMLScriptElement>('script[src]');
  for (let i = scripts.length - 1; i >= 0; i -= 1) {
    const src = scripts[i]?.src;
    if (src && isRendererScript(src)) {
      return src;
    }
  }

  return undefined;
}

function isRendererScript(src: string): boolean {
  return src.includes(SCRIPT_MARKER) || src.includes('@rediads/renderer');
}
