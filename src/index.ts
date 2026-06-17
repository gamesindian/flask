import './styles.css';

export { renderOutstream } from './player';
export {
  createRenderer,
  createSafeRenderer,
  registerSafeRenderer,
  renderBid,
  type CreateRendererOptions,
} from './prebid';
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
import { renderOutstream } from './player';

const api = {
  renderOutstream,
  renderBid,
  createRenderer,
  createSafeRenderer,
  registerSafeRenderer,
};

if (typeof window !== 'undefined') {
  window.RediadsRenderer = api;
  registerSafeRenderer();
}

export default api;
