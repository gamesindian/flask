export interface PrebidBid {
  adId?: string;
  adUnitCode: string;
  vastUrl?: string;
  vastXml?: string;
  width?: number;
  height?: number;
  playerWidth?: number;
  playerHeight?: number;
  mediaType?: string;
  cpm?: number;
  ad?: string;
  adUrl?: string;
}

export interface PrebidRenderer {
  url?: string;
  render: (bid: PrebidBid, doc?: Document) => void;
  backupOnly?: boolean;
  requiresVastUrl?: boolean;
}

export interface PrebidSafeRendererConfig {
  url: string;
  config?: RediadsRendererConfig;
  getConfig?: (bid: PrebidBid) => RediadsRendererConfig;
}

export interface RediadsRendererConfig {
  /** Label shown in the player chrome. Defaults to "Advertisement". */
  adText?: string;
  /** Autoplay behavior. 'viewable' waits until 50% in view. Default: 'viewable'. */
  autoplay?: boolean | 'viewable';
  /** Start muted. Default: true (required for autoplay in most browsers). */
  muted?: boolean;
  /** Show custom transport controls. Default: true. */
  showControls?: boolean;
  /** Show close button that collapses the slot. Default: true. */
  showCloseButton?: boolean;
  /** Seconds before skip button appears. 0 hides skip. Default: 0. */
  skipOffset?: number;
  /** IMA SDK script URL override. */
  imaSdkUrl?: string;
  /** CSS class applied to the root player element. */
  className?: string;
  /** Callback for lifecycle events. */
  onEvent?: (event: RendererEvent) => void;
}

export type RendererEventType =
  | 'ready'
  | 'loading'
  | 'loaded'
  | 'start'
  | 'impression'
  | 'firstQuartile'
  | 'midpoint'
  | 'thirdQuartile'
  | 'complete'
  | 'pause'
  | 'resume'
  | 'skipped'
  | 'click'
  | 'error'
  | 'closed'
  | 'destroyed';

export interface RendererEvent {
  type: RendererEventType;
  bid?: PrebidBid;
  message?: string;
  data?: unknown;
}

export interface OutstreamPlayer {
  destroy: () => void;
  getContainer: () => HTMLElement;
}

export interface SafeRendererPayload extends PrebidBid {
  config?: RediadsRendererConfig;
}
