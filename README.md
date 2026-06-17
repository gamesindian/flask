# @rediads/renderer

Prebid.js outstream video renderer powered by the [Google IMA SDK](https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side), with a polished player UI designed for publisher pages.

## Features

- Prebid.js top-window renderer and Safe Renderer (`pbRenderInFrame`) support
- Accepts `vastUrl` or `vastXml` from any video-capable bidder (`requiresVastUrl: false`)
- Viewability-triggered autoplay (muted by default for browser policy compliance)
- Custom controls: play/pause, mute, fullscreen, skip, close
- Progress bar, ad label, loading state, and graceful error handling
- Responsive 16:9 player with fade-in animation
- TypeScript types included

## Install

```bash
npm install @rediads/renderer
```

Or load the built bundle from your CDN:

```html
<script src="https://cdn.example.com/rediads-renderer.umd.cjs"></script>
<link rel="stylesheet" href="https://cdn.example.com/rediads-renderer.css" />
```

## Quick start with Prebid.js

### 1. Add an outstream slot to the page

```html
<div id="video1"></div>
```

### 2. Register the renderer on the ad unit

```javascript
import { createRenderer } from '@rediads/renderer';

const outstreamRenderer = createRenderer({
  scriptUrl: 'https://cdn.example.com/rediads-renderer.umd.cjs',
  adText: 'Advertisement',
  autoplay: 'viewable',
  muted: true,
  showControls: true,
  showCloseButton: true,
  onEvent: (event) => {
    console.log('Rediads event:', event.type);
  },
});

pbjs.que.push(function () {
  pbjs.addAdUnits([
    {
      code: 'video1',
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [640, 360],
          mimes: ['video/mp4'],
          protocols: [1, 2, 3, 4, 5, 6, 7, 8],
          renderer: outstreamRenderer,
        },
      },
      bids: [
        {
          bidder: 'appnexus',
          params: { placementId: 'YOUR_PLACEMENT_ID' },
        },
      ],
    },
  ]);

  pbjs.requestBids({
    adUnitCodes: ['video1'],
    bidsBackHandler: function () {
      const winningBid = pbjs.getHighestCpmBids('video1')[0];
      if (winningBid) {
        pbjs.renderAd(document, winningBid.adId);
      }
    },
  });
});
```

### Safe Renderer (recommended for Prebid 11.15+)

```javascript
import { createSafeRenderer } from '@rediads/renderer';

const safeRenderer = createSafeRenderer({
  scriptUrl: 'https://cdn.example.com/rediads-renderer.umd.cjs',
  autoplay: 'viewable',
  muted: true,
});

pbjs.addAdUnits([
  {
    code: 'video1',
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: [640, 360],
        safeRenderer,
      },
    },
    bids: [/* ... */],
  },
]);
```

The UMD build automatically registers `window.pbRenderInFrame` for Safe Renderer usage.

## Configuration

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `adText` | `string` | `'Advertisement'` | Label shown in the player chrome |
| `autoplay` | `boolean \| 'viewable'` | `'viewable'` | Autoplay immediately or when 50% in view |
| `muted` | `boolean` | `true` | Start muted (recommended for autoplay) |
| `showControls` | `boolean` | `true` | Show transport controls |
| `showCloseButton` | `boolean` | `true` | Show close button |
| `skipOffset` | `number` | `0` | Seconds before skip button; `0` uses VAST skippable metadata |
| `imaSdkUrl` | `string` | Google IMA CDN | Override IMA SDK script URL |
| `onEvent` | `function` | — | Lifecycle callback (`start`, `complete`, `error`, etc.) |

## API

```typescript
import RediadsRenderer, {
  renderOutstream,
  createRenderer,
  createSafeRenderer,
  renderBid,
} from '@rediads/renderer';
import '@rediads/renderer/style.css';

// Direct render (no Prebid)
const player = renderOutstream(bid, containerElement, config);
player.destroy();

// Prebid renderer factory
const renderer = createRenderer({ scriptUrl: '...', muted: true });
```

## Development

```bash
npm install
npm run dev      # opens examples/demo.html
npm run build    # outputs dist/
npm run typecheck
```

## Project structure

```
src/
  index.ts      # public API + global exports
  player.ts     # IMA outstream player
  prebid.ts     # Prebid renderer helpers
  ui.ts         # player chrome / controls
  utils.ts      # IMA loader, viewability helpers
  styles.css    # player styles
examples/
  demo.html     # local demo page
```

## License

MIT
