# Sanity Studio branding — navbar logo + dashboard rail icon

**Sanity forks only.** Read this when you reach the Studio-branding step. It is
long because the dashboard rail icon has a non-obvious failure mode; the mechanism
section is what stops you from shipping a broken icon.

Make the fork's Studio show **the project's own logo in BOTH places:** (1) the
Studio **navbar** (top-left inside the studio app), and (2) the Sanity **dashboard
app rail** (the vertical icon strip in the outer `www.sanity.io` dashboard shell,
one icon per deployed studio). The starter ships placeholder versions of these two
components reading from `logo-paths.ts`; this step replaces them with the
data-URI approach that the dashboard rail requires. **Apply this during setup;
verify it after `npx sanity deploy` (see references/sanity.md).**

**Why this is tricky (the mechanism — do not skip).** The dashboard does NOT render
your icon component live. Per Sanity's docs (`/docs/dashboard/dashboard-configure`):

- The workspace `icon` from `sanity.config.ts` is **extracted into the studio
  manifest** (`<host>.sanity.studio/static/create-manifest.json`,
  `workspaces[0].icon`) on every `npx sanity deploy`.
- The dashboard then renders that icon inside a **sandboxed `srcdoc` iframe** whose
  stylesheet forces `svg { width:100%; aspect-ratio:1 }`.

Hard rules that follow:

- The icon MUST be a **static, self-contained SVG** (no hooks, context, imports of
  external values, or dynamic logic).
- Size it with the `width`/`height` **ATTRIBUTES** (`width="1em" height="1em"`) plus
  a `viewBox`. Do NOT use an inline `style` for size — it beats the iframe's
  stylesheet and pins the icon tiny.
- Do NOT use an `<img>` for the icon — the iframe's `svg{width:100%}` rule doesn't
  target `<img>`, so it renders at intrinsic (tiny) size, and a bundled asset URL
  404s in the dashboard's outer document.
- A raster logo CAN be used by embedding it as a base64 data URI inside an
  `<svg><image href="data:..."/></svg>` — the data URI is self-contained, so it
  serializes into the manifest and renders in the sandbox. (A pure-vector inline
  `<svg>` works too and is crisper — if the brand has clean vector paths, keep the
  `logo-paths.ts` inline-`<svg>` approach instead; the data-URI route below is for
  raster/webclip-only logos.)

**Input:** a square logo badge PNG with the logo centered — in this starter,
`public/images/webclip.png` (the apple-touch/webclip image, step 1d). A wide logo
will letterbox in the square tile; a square mark fills best.

**Step 1 — generate the trimmed square data URI.** The source badge usually has
built-in transparent padding, making the logo float small in the tile. Trim it to
its content bbox, re-center on a tight square, embed as base64. Requires Pillow
(`python3 -m pip install --user Pillow`). This WRITES
`src/sanity/components/studioIconData.ts`:

```bash
python3 - <<'PY'
from PIL import Image
import base64, io
src = Image.open("public/images/webclip.png").convert("RGBA")
logo = src.crop(src.getbbox())            # trim transparent padding
w, h = logo.size
margin = round(0.05 * max(w, h))
side = max(w, h) + 2 * margin
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
canvas.paste(logo, ((side - w)//2, (side - h)//2), logo)   # center on tight square
buf = io.BytesIO(); canvas.save(buf, "PNG", optimize=True)
b64 = base64.b64encode(buf.getvalue()).decode()
open("src/sanity/components/studioIconData.ts","w").write(
'/**\n * Square brand badge for the Studio workspace `icon` + navbar logo, as a\n'
' * base64 data URI. Derived from the square webclip with padding trimmed and the\n'
' * logo re-centered on a tight square. Data URI (not an asset import) because the\n'
' * dashboard serializes the icon into its manifest and renders it in a sandboxed\n'
' * iframe where a bundled URL 404s. Regenerate with the Pillow trim script.\n */\n'
'export const STUDIO_ICON_DATA_URI =\n  "data:image/png;base64,' + b64 + '";\n')
print("wrote studioIconData.ts; square side =", side)
PY
```

**Step 2 — `StudioIcon.tsx` (dashboard rail icon): inline SVG, attribute-sized.**
Set the `viewBox` and `<image>` width/height to the square `side` **the script
printed** (it's `132` below only as an example — substitute the printed value).

```tsx
import { STUDIO_ICON_DATA_URI } from "./studioIconData";

export function StudioIcon() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 132 132" /* match the square `side` from step 1 */
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="<Brand> icon"
    >
      <image href={STUDIO_ICON_DATA_URI} x={0} y={0} width={132} height={132} />
    </svg>
  );
}
export default StudioIcon;
```

**Step 3 — `StudioLogo.tsx` (navbar): plain `<img>` is fine here.** The navbar
renders in-app (NOT serialized, NOT sandboxed), so an `<img>` data URI works and is
simplest.

```tsx
import { STUDIO_ICON_DATA_URI } from "./studioIconData";

export function StudioLogo() {
  return (
    <img
      src={STUDIO_ICON_DATA_URI}
      alt="<Brand> logo"
      style={{ height: "32px", width: "auto", display: "block" }}
    />
  );
}
export default StudioLogo;
```

**Step 4 — wire them in `sanity.config.ts`** (already wired in the starter; confirm
the imports still resolve after the edits above):

```ts
import { StudioLogo } from "./src/sanity/components/StudioLogo";
import { StudioIcon } from "./src/sanity/components/StudioIcon";

export default defineConfig({
  // ...
  icon: StudioIcon, // DASHBOARD RAIL icon (serialized to manifest)
  studio: { components: { logo: StudioLogo } }, // NAVBAR logo
});
```

**Step 5 — deploy & VERIFY (during the Sanity deploy — do not skip the manifest check).**
After `npx sanity build` + `npx sanity deploy`, confirm the icon serialized as an
inline `<svg>` (NOT an `<img>`, NOT empty):

```bash
curl -s "https://<your-studio-host>.sanity.studio/static/create-manifest.json" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['workspaces'][0]['icon'][:200])"
```

Expected output begins with:
`<svg width="1em" height="1em" viewBox="0 0 132 132" ...><image href="data:image/png;base64,...`
If it shows an `<img …>` or is empty, the rail icon will be broken/tiny.

**Gotchas to tell the user:**

- Changes only appear after `npx sanity deploy`; the dashboard caches the rail icon
