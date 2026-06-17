import { renderOutstream } from './player';
import type { PrebidBid, PrebidRenderer, RediadsRendererConfig } from './types';

export interface CreateRendererOptions extends RediadsRendererConfig {
  /** CDN URL where the built renderer script is hosted. Used by Prebid to preload the script. */
  scriptUrl?: string;
}

/**
 * Creates a Prebid.js-compatible renderer object for outstream video ads.
 *
 * Attach to `adUnit.mediaTypes.video.renderer` (preferred) or `adUnit.renderer`.
 */
export function createRenderer(options: CreateRendererOptions = {}): PrebidRenderer {
  const { scriptUrl, ...config } = options;

  return {
    url: scriptUrl,
    requiresVastUrl: false,
    backupOnly: false,
    render(bid: PrebidBid, doc?: Document) {
      renderOutstream(bid, null, config, doc ?? document);
    },
  };
}

/**
 * Convenience helper for publishers who define inline render functions.
 */
export function renderBid(bid: PrebidBid, config?: RediadsRendererConfig, doc?: Document): void {
  renderOutstream(bid, null, config, doc ?? document);
}

/**
 * Registers the Safe Renderer entry point used by Prebid's `safeRenderer.url`.
 */
export function registerSafeRenderer(): void {
  if (typeof window === 'undefined') return;

  window.pbRenderInFrame = (payload) => {
    const { config, ...bid } = payload;
    renderOutstream(bid, document.body, config, document);
  };
}

/**
 * Returns a Prebid Safe Renderer config object.
 */
export function createSafeRenderer(options: CreateRendererOptions = {}) {
  const { scriptUrl, ...config } = options;

  if (!scriptUrl) {
    throw new Error('[Rediads Renderer] scriptUrl is required for createSafeRenderer().');
  }

  return {
    url: scriptUrl,
    getConfig: () => config,
  };
}
