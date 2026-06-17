import type {
  ImaAdErrorEvent,
  ImaAdStartedEvent,
  ImaAdsLoader,
  ImaAdsManager,
  ImaAdsManagerLoadedEvent,
} from './global';
import {
  buildPlayerChrome,
  setLoading,
  setMutedState,
  setPlayingState,
  showError,
  updateProgress,
  updateSkipButton,
} from './ui';
import {
  createUniqueId,
  emitEvent,
  loadImaSdk,
  resolveContainer,
  resolveDimensions,
  waitForViewability,
} from './utils';
import type { OutstreamPlayer, PrebidBid, RediadsRendererConfig, RendererEventType } from './types';

const DEFAULT_CONFIG: Required<
  Pick<
    RediadsRendererConfig,
    'adText' | 'autoplay' | 'muted' | 'showControls' | 'showCloseButton' | 'skipOffset' | 'imaSdkUrl'
  >
> = {
  adText: 'Advertisement',
  autoplay: 'viewable',
  muted: true,
  showControls: true,
  showCloseButton: true,
  skipOffset: 0,
  imaSdkUrl: 'https://imasdk.googleapis.com/js/sdkloader/ima3.js',
};

function getIma() {
  const ima = window.google?.ima;
  if (!ima) {
    throw new Error('Google IMA SDK is not available on window.google.ima');
  }
  return ima;
}

export function renderOutstream(
  bid: PrebidBid,
  container?: HTMLElement | null,
  config: RediadsRendererConfig = {},
  doc: Document = document
): OutstreamPlayer {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const target = container ?? resolveContainer(bid.adUnitCode, doc);

  if (!target) {
    throw new Error(
      `[Rediads Renderer] Container not found for ad unit "${bid.adUnitCode}".`
    );
  }

  if (!bid.vastUrl && !bid.vastXml) {
    throw new Error('[Rediads Renderer] Bid is missing both vastUrl and vastXml.');
  }

  const dimensions = resolveDimensions(bid, target);
  const chrome = buildPlayerChrome(target, mergedConfig, dimensions);
  const playerId = createUniqueId('rediads-player', bid.adId);

  let destroyed = false;
  let adsLoader: ImaAdsLoader | null = null;
  let adsManager: ImaAdsManager | null = null;
  let started = false;
  let duration = 0;
  let progressTimer: number | null = null;
  let skipTimer: number | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const fire = (
    type: RendererEventType,
    extra: Partial<{ message: string; data: unknown }> = {}
  ) => {
    emitEvent(mergedConfig, { type, bid, ...extra });
  };

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;

    if (progressTimer != null) {
      window.clearInterval(progressTimer);
      progressTimer = null;
    }
    if (skipTimer != null) {
      window.clearInterval(skipTimer);
      skipTimer = null;
    }
    resizeObserver?.disconnect();
    resizeObserver = null;

    try {
      adsManager?.destroy();
    } catch {
      // ignore destroy errors
    }
    adsManager = null;

    try {
      adsLoader?.destroy();
    } catch {
      // ignore destroy errors
    }
    adsLoader = null;

    chrome.video.src = '';
    chrome.video.load();
    fire('destroyed');
  };

  const getViewMode = (): string => {
    const ima = getIma();
    return document.fullscreenElement === chrome.root
      ? ima.ViewMode.FULLSCREEN
      : ima.ViewMode.NORMAL;
  };

  const resizeAds = () => {
    if (!adsManager) return;
    const { width, height } = resolveDimensions(bid, target);
    adsManager.resize(width, height, getViewMode());
    chrome.root.style.setProperty('--rediads-width', `${width}px`);
    chrome.root.style.setProperty('--rediads-height', `${height}px`);
  };

  const startPlayback = () => {
    if (started || !adsManager) return;
    started = true;
    adsManager.start();
    setPlayingState(chrome, true);
    fire('start');
  };

  const bindControls = () => {
    chrome.playButton.addEventListener('click', () => {
      if (!adsManager) return;
      if (chrome.root.classList.contains('rediads-outstream--playing')) {
        adsManager.pause();
      } else if (!started) {
        startPlayback();
      } else {
        adsManager.resume();
      }
    });

    chrome.muteButton.addEventListener('click', () => {
      if (!adsManager) return;
      const nextMuted = adsManager.getVolume() > 0;
      adsManager.setVolume(nextMuted ? 0 : 1);
      chrome.video.muted = nextMuted;
      setMutedState(chrome, nextMuted);
    });

    chrome.fullscreenButton.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement === chrome.root) {
          await document.exitFullscreen();
        } else {
          await chrome.root.requestFullscreen();
        }
      } catch {
        // Fullscreen may be blocked by browser policy.
      }
      resizeAds();
    });

    chrome.skipButton.addEventListener('click', () => {
      adsManager?.skip();
    });

    chrome.closeButton.addEventListener('click', () => {
      fire('closed');
      cleanup();
      target.style.minHeight = '0';
      target.innerHTML = '';
    });

    document.addEventListener('fullscreenchange', resizeAds);

    resizeObserver = new ResizeObserver(() => resizeAds());
    resizeObserver.observe(target);
  };

  const trackProgress = () => {
    if (progressTimer != null) {
      window.clearInterval(progressTimer);
    }
    progressTimer = window.setInterval(() => {
      if (!adsManager || duration <= 0) return;
      const remaining = adsManager.getRemainingTime();
      const current = Math.max(0, duration - remaining);
      updateProgress(chrome, current, duration);
    }, 250);
  };

  const setupSkipCountdown = (offset: number) => {
    if (offset <= 0) return;

    let remaining = offset;
    updateSkipButton(chrome, true, remaining);

    skipTimer = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        updateSkipButton(chrome, true, remaining);
      } else {
        window.clearInterval(skipTimer!);
        skipTimer = null;
        updateSkipButton(chrome, true);
      }
    }, 1000);
  };

  const onAdsManagerLoaded = (manager: ImaAdsManager) => {
    const ima = getIma();
    adsManager = manager;
    setLoading(chrome, false);
    fire('loaded');

    const { width, height } = resolveDimensions(bid, target);
    adsManager.init(width, height, ima.ViewMode.NORMAL);
    adsManager.setVolume(mergedConfig.muted ? 0 : 1);

    const adEvents: Array<[string, RendererEventType]> = [
      [ima.AdEvent.IMPRESSION, 'impression'],
      [ima.AdEvent.FIRST_QUARTILE, 'firstQuartile'],
      [ima.AdEvent.MIDPOINT, 'midpoint'],
      [ima.AdEvent.THIRD_QUARTILE, 'thirdQuartile'],
      [ima.AdEvent.COMPLETE, 'complete'],
      [ima.AdEvent.PAUSED, 'pause'],
      [ima.AdEvent.RESUMED, 'resume'],
      [ima.AdEvent.SKIPPED, 'skipped'],
      [ima.AdEvent.CLICK, 'click'],
    ];

    adEvents.forEach(([imaEvent, eventType]) => {
      adsManager!.addEventListener(imaEvent, () => fire(eventType));
    });

    adsManager.addEventListener(ima.AdEvent.STARTED, (event: unknown) => {
      const adEvent = event as ImaAdStartedEvent;
      duration = adEvent.getAd()?.getDuration?.() ?? 0;
      setPlayingState(chrome, true);
      trackProgress();

      const skipOffset =
        mergedConfig.skipOffset > 0
          ? mergedConfig.skipOffset
          : adEvent.getAd()?.getSkipTimeOffset?.() ?? 0;

      if (adEvent.getAd()?.isSkippable?.() && skipOffset > 0) {
        setupSkipCountdown(skipOffset);
      } else if (adEvent.getAd()?.isSkippable?.()) {
        updateSkipButton(chrome, true);
      }
    });

    adsManager.addEventListener(ima.AdEvent.ALL_ADS_COMPLETED, () => {
      setPlayingState(chrome, false);
      fire('complete');
      cleanup();
      target.classList.add('rediads-outstream-slot--completed');
    });

    adsManager.addEventListener(ima.AdErrorEvent.Type, (event: unknown) => {
      const adError = (event as ImaAdErrorEvent).getError();
      const message = adError?.getMessage?.() ?? 'Ad playback error';
      showError(chrome, message);
      fire('error', { message, data: { code: adError?.getErrorCode?.() } });
      cleanup();
    });

    const maybeAutoplay = async () => {
      if (mergedConfig.autoplay === false) {
        setPlayingState(chrome, false);
        return;
      }

      if (mergedConfig.autoplay === 'viewable') {
        await waitForViewability(chrome.root, 0.5);
      }

      if (!destroyed) {
        startPlayback();
      }
    };

    void maybeAutoplay();
  };

  const requestAds = () => {
    const ima = getIma();
    const { width, height } = resolveDimensions(bid, target);
    const request = new ima.AdsRequest();

    request.linearAdSlotWidth = width;
    request.linearAdSlotHeight = height;
    request.nonLinearAdSlotWidth = width;
    request.nonLinearAdSlotHeight = height;

    request.setAdWillAutoPlay?.(mergedConfig.autoplay !== false);
    request.setAdWillPlayMuted?.(mergedConfig.muted);

    if (bid.vastXml) {
      request.setAdsResponse?.(bid.vastXml);
    } else if (bid.vastUrl) {
      request.adTagUrl = bid.vastUrl;
    }

    adsLoader = new ima.AdsLoader(chrome.adContainer);

    adsLoader.addEventListener('adsManagerLoaded', (event: unknown) => {
      const loadedEvent = event as ImaAdsManagerLoadedEvent;
      onAdsManagerLoaded(loadedEvent.getAdsManager(chrome.video));
    });

    adsLoader.addEventListener(ima.AdErrorEvent.Type, (event: unknown) => {
      const adError = (event as ImaAdErrorEvent).getError();
      const message = adError?.getMessage?.() ?? 'Failed to request ads';
      showError(chrome, message);
      fire('error', { message, data: { code: adError?.getErrorCode?.() } });
      cleanup();
    });

    adsLoader.requestAds(request);
  };

  const init = async () => {
    bindControls();
    setLoading(chrome, true);
    fire('loading');
    fire('ready', { data: { playerId } });

    try {
      await loadImaSdk(mergedConfig.imaSdkUrl);
      if (destroyed) return;
      requestAds();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize IMA SDK';
      showError(chrome, message);
      fire('error', { message });
      cleanup();
    }
  };

  void init();

  return {
    destroy: cleanup,
    getContainer: () => chrome.root,
  };
}
