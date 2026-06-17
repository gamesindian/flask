import './styles.css';

export { renderOutstream } from './player';
export {
  createRenderer,
  createSafeRenderer,
  registerSafeRenderer,
  renderBid,
  type CreateRendererOptions,
} from './prebid';
export {
  enableOutstream,
  autoInitFromScript,
  tagOutstreamSlots,
  type EnableOutstreamOptions,
  type OutstreamSlot,
  type OutstreamBidder,
} from './bootstrap';
export { injectStyles } from './inject-styles';
export type {
  OutstreamPlayer,
  PrebidBid,
  PrebidRenderer,
  PrebidSafeRendererConfig,
  RediadsRendererConfig,
  RendererEvent,
  RendererEventType,
  SafeRendererPayload,
} from './types';

import {
  createRenderer,
  createSafeRenderer,
  registerSafeRenderer,
  renderBid,
} from './prebid';
import { autoInitFromScript, enableOutstream } from './bootstrap';
import { injectStyles } from './inject-styles';
import { renderOutstream } from './player';

const api = {
  renderOutstream,
  renderBid,
  createRenderer,
  createSafeRenderer,
  registerSafeRenderer,
  enableOutstream,
  autoInitFromScript,
};

if (typeof window !== 'undefined') {
  injectStyles();
  registerSafeRenderer();
  window.rediads = api;
  window.RediadsRenderer = api;
  autoInitFromScript();
}

export default api;
