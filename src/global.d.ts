export {};

export interface RediadsRendererApi {
  renderOutstream: typeof import('./player').renderOutstream;
  renderBid: typeof import('./prebid').renderBid;
  createRenderer: typeof import('./prebid').createRenderer;
  createSafeRenderer: typeof import('./prebid').createSafeRenderer;
  registerSafeRenderer: typeof import('./prebid').registerSafeRenderer;
  enableOutstream: typeof import('./bootstrap').enableOutstream;
  autoInitFromScript: typeof import('./bootstrap').autoInitFromScript;
}

declare global {
  interface Window {
    RediadsRenderer?: RediadsRendererApi;
    /** Publisher-friendly global alias */
    rediads?: RediadsRendererApi;
    google?: GoogleIma;
    pbRenderInFrame?: (payload: import('./types').SafeRendererPayload) => void;
  }
}

export interface GoogleIma {
  ima: {
    AdEvent: {
      LOADED: string;
      STARTED: string;
      IMPRESSION: string;
      FIRST_QUARTILE: string;
      MIDPOINT: string;
      THIRD_QUARTILE: string;
      COMPLETE: string;
      PAUSED: string;
      RESUMED: string;
      SKIPPED: string;
      CLICK: string;
      ALL_ADS_COMPLETED: string;
      AD_ERROR: string;
    };
    AdErrorEvent: {
      Type: string;
    };
    ViewMode: {
      NORMAL: string;
      FULLSCREEN: string;
    };
    AdsLoader: new (container: HTMLElement) => ImaAdsLoader;
    AdsRequest: new () => ImaAdsRequest;
    AdsManager: ImaAdsManager;
  };
}

export interface ImaAdsLoader {
  addEventListener(type: string, listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: unknown) => void): void;
  requestAds(request: ImaAdsRequest): void;
  contentComplete(): void;
  destroy(): void;
}

export interface ImaAdsRequest {
  adTagUrl?: string;
  linearAdSlotWidth?: number;
  linearAdSlotHeight?: number;
  nonLinearAdSlotWidth?: number;
  nonLinearAdSlotHeight?: number;
  setAdWillAutoPlay?(willAutoPlay: boolean): void;
  setAdWillPlayMuted?(willPlayMuted: boolean): void;
  setAdsResponse?(response: string): void;
}

export interface ImaAdsManager {
  init(width: number, height: number, viewMode: string): void;
  start(): void;
  pause(): void;
  resume(): void;
  skip(): void;
  destroy(): void;
  setVolume(volume: number): void;
  getVolume(): number;
  resize(width: number, height: number, viewMode: string): void;
  addEventListener(type: string, listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: unknown) => void): void;
  getRemainingTime(): number;
  getAdSkippableState(): boolean;
}

export interface ImaAdError {
  getMessage(): string;
  getErrorCode(): number;
}

export interface ImaAdErrorEvent {
  getError(): ImaAdError;
}

export interface ImaAd {
  getDuration(): number;
  isSkippable(): boolean;
  getSkipTimeOffset(): number;
}

export interface ImaAdStartedEvent {
  getAd(): ImaAd;
}

export interface ImaAdsManagerLoadedEvent {
  getAdsManager(video: HTMLVideoElement): ImaAdsManager;
}
