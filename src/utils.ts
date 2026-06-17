import type { RediadsRendererConfig, RendererEvent } from './types';

export const DEFAULT_IMA_SDK_URL =
  'https://imasdk.googleapis.com/js/sdkloader/ima3.js';

const IMA_SCRIPT_ID = 'rediads-ima-sdk';

let imaLoadPromise: Promise<void> | null = null;

export function loadImaSdk(url: string = DEFAULT_IMA_SDK_URL): Promise<void> {
  if (window.google?.ima?.AdsLoader) {
    return Promise.resolve();
  }

  if (imaLoadPromise) {
    return imaLoadPromise;
  }

  imaLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(IMA_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google IMA SDK')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.id = IMA_SCRIPT_ID;
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      imaLoadPromise = null;
      reject(new Error(`Failed to load IMA SDK from ${url}`));
    };
    document.head.appendChild(script);
  });

  return imaLoadPromise;
}

export function resolveContainer(
  adUnitCode: string,
  doc: Document = document
): HTMLElement | null {
  return doc.getElementById(adUnitCode);
}

export function resolveDimensions(
  bid: { width?: number; height?: number; playerWidth?: number; playerHeight?: number },
  container: HTMLElement
): { width: number; height: number } {
  const width =
    bid.playerWidth ??
    bid.width ??
    (container.clientWidth || container.offsetWidth || 640);
  const height =
    bid.playerHeight ??
    bid.height ??
    (container.clientHeight || container.offsetHeight || 360);

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

export function emitEvent(
  config: RediadsRendererConfig | undefined,
  event: RendererEvent
): void {
  try {
    config?.onEvent?.(event);
  } catch {
    // Publisher callbacks must not break rendering.
  }
}

export function createUniqueId(prefix: string, seed?: string): string {
  const safeSeed = seed?.replace(/[^a-zA-Z0-9_-]/g, '') || '';
  const suffix = safeSeed || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefix}-${suffix}`;
}

export function waitForViewability(
  element: HTMLElement,
  threshold = 0.5
): Promise<void> {
  if (!('IntersectionObserver' in window)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && entry.intersectionRatio >= threshold) {
          observer.disconnect();
          resolve();
        }
      },
      { threshold }
    );
    observer.observe(element);
  });
}
