# @rediads/renderer

Prebid.js outstream video renderer powered by the [Google IMA SDK](https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side), with a polished player UI designed for publisher pages.

## Publisher quick start (minimum effort)

**3 steps.** One script file — no separate CSS, no IMA setup, no renderer wiring.

### 1. Add a slot to your article

```html
<div id="video1"></div>
```

### 2. Load Prebid + Rediads

```html
<script async src="/path/to/prebid.js"></script>
<script src="https://cdn.yoursite.com/rediads-renderer.umd.cjs"></script>
```

### 3. One line of config

```html
<script>
  rediads.enableOutstream({
    slots: [{
      code: 'video1',
      bidders: [{ bidder: 'appnexus', params: { placementId: 'YOUR_PLACEMENT_ID' } }],
    }],
  });
</script>
```

That's it. Rediads automatically:

- Injects player CSS (no `<link>` tag needed)
- Attaches the outstream renderer to your ad unit
- Sets all required video mediaType fields (`context: outstream`, mimes, protocols, etc.)
- Queues setup on `pbjs.que` (works even if Prebid loads after this script)
- Runs the auction and renders the winning ad

### Zero-JS init (config on the script tag)

```html
<div id="video1"></div>

<script async src="/path/to/prebid.js"></script>
<script
  src="https://cdn.yoursite.com/rediads-renderer.umd.cjs"
  data-rediads-auto='{
    "slots": [{
      "code": "video1",
      "bidders": [{ "bidder": "appnexus", "params": { "placementId": "YOUR_PLACEMENT_ID" } }]
    }]
  }'
></script>
```

### Google Ad Manager publishers

If GAM serves the winning Prebid creative, only register the ad units — don't auto-auction:

```javascript
rediads.enableOutstream({
  gam: true,
  slots: [{
    code: 'video1',
    bidders: [{ bidder: 'appnexus', params: { placementId: 'YOUR_ID' } }],
  }],
});
```

Then call `googletag.display('video1')` as usual.

---

## What publishers still need to provide

| Required | Example |
|----------|---------|
| Slot `<div id="...">` | `video1` |
| Prebid.js on the page | Your custom build |
| At least one bidder per slot | `appnexus`, `rubicon`, etc. |

Everything else is handled by the renderer.

---

## Advanced / manual integration

For custom Prebid setups, use the lower-level API:

```javascript
import { createRenderer } from '@rediads/renderer';

const renderer = createRenderer({ autoplay: 'viewable', muted: true });

pbjs.addAdUnits([{
  code: 'video1',
  mediaTypes: {
    video: { context: 'outstream', playerSize: [640, 360], renderer },
  },
  bids: [/* ... */],
}]);
```

See [full API docs](#api) below.

---

## Features

- **One-call setup** — `rediads.enableOutstream()`
- Prebid.js top-window renderer and Safe Renderer (`pbRenderInFrame`) support
- Accepts `vastUrl` or `vastXml` from any video-capable bidder (`requiresVastUrl: false`)
- Viewability-triggered autoplay (muted by default)
- Custom controls: play/pause, mute, fullscreen, skip, close
- Progress bar, ad label, loading state, and graceful error handling
- Responsive 16:9 player with fade-in animation
- TypeScript types included

## Install (npm)

```bash
npm install @rediads/renderer
```

```javascript
import rediads from '@rediads/renderer';
import '@rediads/renderer/style.css';

rediads.enableOutstream({ slots: [/* ... */] });
```

## Configuration

### `enableOutstream` options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `slots` | `OutstreamSlot[]` | **required** | Ad units to register |
| `slots[].code` | `string` | **required** | Must match `<div id>` |
| `slots[].bidders` | `array` | **required** | Standard Prebid bid objects |
| `slots[].size` | `[w, h]` | `[640, 360]` | Player dimensions |
| `gam` | `boolean` | `false` | Register only; GAM handles auction/render |
| `timeout` | `number` | `2000` | Prebid auction timeout (ms) |
| `adText` | `string` | `'Advertisement'` | Label in player chrome |
| `autoplay` | `boolean \| 'viewable'` | `'viewable'` | Autoplay when 50% in view |
| `muted` | `boolean` | `true` | Start muted |
| `showControls` | `boolean` | `true` | Transport controls |
| `showCloseButton` | `boolean` | `true` | Close button |
| `onEvent` | `function` | — | Lifecycle callback |

### Renderer options (manual API)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `adText` | `string` | `'Advertisement'` | Label shown in the player chrome |
| `autoplay` | `boolean \| 'viewable'` | `'viewable'` | Autoplay immediately or when 50% in view |
| `muted` | `boolean` | `true` | Start muted (required for autoplay in most browsers) |
| `showControls` | `boolean` | `true` | Show transport controls |
| `showCloseButton` | `boolean` | `true` | Show close button |
| `skipOffset` | `number` | `0` | Seconds before skip button; `0` uses VAST metadata |
| `imaSdkUrl` | `string` | Google IMA CDN | Override IMA SDK script URL |
| `onEvent` | `function` | — | Lifecycle callback (`start`, `complete`, `error`, etc.) |

## API

```typescript
import rediads, {
  enableOutstream,
  renderOutstream,
  createRenderer,
  createSafeRenderer,
} from '@rediads/renderer';

// Minimum effort (recommended)
enableOutstream({
  slots: [{ code: 'video1', bidders: [/* ... */] }],
});

// Direct render (no Prebid)
const player = renderOutstream(bid, containerElement, config);
player.destroy();

// Prebid renderer factory (manual)
const renderer = createRenderer({ muted: true });
```

## Safe Renderer (Prebid 11.15+)

```javascript
const safeRenderer = rediads.createSafeRenderer({
  scriptUrl: 'https://cdn.yoursite.com/rediads-renderer.umd.cjs',
  autoplay: 'viewable',
  muted: true,
});
```

## Development

```bash
npm install
npm run dev          # examples dev server
npm run dev:test     # opens test page directly
npm run build        # outputs dist/
npm run typecheck
```

### Test page

Open `examples/test.html` via the dev server:

```bash
npm run dev:test
# → http://localhost:5173/test.html
```

The test page includes:

- **Direct render** — tests `renderOutstream()` with Google sample VAST tags
- **Mock Prebid flow** — tests `enableOutstream()` with a simulated `pbjs`
- Player option toggles (muted, viewable autoplay, controls, etc.)
- Live event log

## Project structure

```
src/
  bootstrap.ts  # enableOutstream() — publisher one-call API
  player.ts     # IMA outstream player
  prebid.ts     # Prebid renderer helpers
  ui.ts         # player chrome / controls
  utils.ts      # IMA loader, viewability helpers
  styles.css    # player styles (auto-injected in UMD build)
examples/
  minimal.html  # copy-paste publisher example
  index.html    # examples landing page
  test.html     # interactive test page (VAST presets + mock Prebid)
  demo.html     # IMA direct render demo
  minimal.html  # copy-paste publisher example
```

## License

MIT
