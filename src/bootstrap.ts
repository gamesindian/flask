import { createRenderer } from './prebid';
import { injectStyles } from './inject-styles';
import { detectScriptUrl } from './script-url';
import type { RediadsRendererConfig } from './types';

export interface OutstreamBidder {
  bidder: string;
  params: Record<string, unknown>;
  /** Optional per-bidder overrides */
  renderer?: unknown;
}

export interface OutstreamSlot {
  /** Must match the slot element id on the page */
  code: string;
  /** Prebid bidder configs for this slot */
  bidders: OutstreamBidder[];
  /** Player size. Default: [640, 360] */
  size?: [number, number];
}

export interface EnableOutstreamOptions extends RediadsRendererConfig {
  slots: OutstreamSlot[];
  /** Prebid auction timeout in ms. Default: 2000 */
  timeout?: number;
  /**
   * Set true when using Google Ad Manager to serve the winning Prebid creative.
   * Skips automatic requestBids/renderAd — only registers ad units + renderer.
   */
  gam?: boolean;
  /** Override renderer script URL (auto-detected from script tag by default) */
  scriptUrl?: string;
  /** Custom pbjs global name. Default: 'pbjs' */
  pbjsGlobal?: string;
}

interface PbjsLike {
  que: Array<(pbjs: PbjsLike) => void>;
  addAdUnits: (units: unknown[]) => void;
  requestBids: (opts: {
    adUnitCodes?: string[];
    timeout?: number;
    bidsBackHandler?: () => void;
  }) => void;
  getHighestCpmBids: (code: string) => Array<{ adId: string }>;
  renderAd: (doc: Document, adId: string) => void;
}

const DEFAULT_SIZE: [number, number] = [640, 360];

const DEFAULT_VIDEO_MEDIA = {
  mimes: ['video/mp4'],
  protocols: [1, 2, 3, 4, 5, 6, 7, 8],
  playbackmethod: [2],
  skip: 1,
};

function enqueuePbjs(callback: (pbjs: PbjsLike) => void, globalName = 'pbjs'): void {
  const w = window as unknown as Record<string, PbjsLike | undefined>;
  if (!w[globalName]) {
    w[globalName] = { que: [] } as unknown as PbjsLike;
  }
  const pbjs = w[globalName]!;
  pbjs.que = pbjs.que || [];
  pbjs.que.push(callback);
}

function buildAdUnit(slot: OutstreamSlot, renderer: ReturnType<typeof createRenderer>) {
  const size = slot.size ?? DEFAULT_SIZE;

  return {
    code: slot.code,
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: size,
        ...DEFAULT_VIDEO_MEDIA,
        renderer,
      },
    },
    bids: slot.bidders,
  };
}

function validateSlots(slots: OutstreamSlot[]): void {
  if (!slots?.length) {
    throw new Error('[Rediads] At least one slot is required.');
  }

  for (const slot of slots) {
    if (!slot.code) {
      throw new Error('[Rediads] Each slot must have a code matching its div id.');
    }
    if (!document.getElementById(slot.code)) {
      console.warn(
        `[Rediads] No element found with id="${slot.code}". Add <div id="${slot.code}" data-rediads-outstream></div> to your page.`
      );
    }
    if (!slot.bidders?.length) {
      throw new Error(`[Rediads] Slot "${slot.code}" requires at least one bidder.`);
    }
  }
}

/**
 * One-call publisher setup. Registers outstream ad units with Prebid and
 * optionally runs the auction + render flow.
 *
 * @example
 * rediads.enableOutstream({
 *   slots: [{
 *     code: 'video1',
 *     bidders: [{ bidder: 'appnexus', params: { placementId: '123' } }],
 *   }],
 * });
 */
export function enableOutstream(options: EnableOutstreamOptions): void {
  const {
    slots,
    timeout = 2000,
    gam = false,
    scriptUrl,
    pbjsGlobal = 'pbjs',
    ...rendererConfig
  } = options;

  injectStyles();
  validateSlots(slots);

  const resolvedScriptUrl = scriptUrl ?? detectScriptUrl();
  const renderer = createRenderer({
    ...rendererConfig,
    scriptUrl: resolvedScriptUrl,
  });

  const adUnits = slots.map((slot) => buildAdUnit(slot, renderer));
  const adUnitCodes = slots.map((s) => s.code);

  tagOutstreamSlots(adUnitCodes);

  const run = (pbjs: PbjsLike) => {
    pbjs.addAdUnits(adUnits);

    if (gam) return;

    pbjs.requestBids({
      adUnitCodes,
      timeout,
      bidsBackHandler: () => {
        for (const code of adUnitCodes) {
          const winningBid = pbjs.getHighestCpmBids(code)[0];
          if (winningBid?.adId) {
            pbjs.renderAd(document, winningBid.adId);
          }
        }
      },
    });
  };

  enqueuePbjs(run, pbjsGlobal);
}

/**
 * Reads `data-rediads-auto` JSON from the renderer script tag and initializes.
 * Lowest-effort integration when config is embedded on the script element.
 */
export function autoInitFromScript(): boolean {
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    [...document.querySelectorAll<HTMLScriptElement>('script[data-rediads-auto]')].pop();

  const raw = script?.getAttribute('data-rediads-auto');
  if (!raw) return false;

  try {
    const options = JSON.parse(raw) as EnableOutstreamOptions;
    enableOutstream(options);
    return true;
  } catch (error) {
    console.error('[Rediads] Invalid data-rediads-auto JSON:', error);
    return false;
  }
}

/**
 * Marks slot elements with data-rediads-outstream for styling/validation hints.
 */
export function tagOutstreamSlots(codes: string[]): void {
  for (const code of codes) {
    const el = document.getElementById(code);
    if (el) {
      el.setAttribute('data-rediads-outstream', '');
    }
  }
}
