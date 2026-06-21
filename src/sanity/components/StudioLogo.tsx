/**
 * Brand wordmark — rendered in the Studio navbar via `studio.components.logo`
 * in sanity.config.ts. Uses `currentColor` so it adapts to the Studio's
 * light/dark theme. Artwork comes from the shared path data in
 * src/config/logo-paths.ts (same source the front-end Logo uses), so a logo
 * redesign is a single edit.
 */
import {
  LOGO_VIEWBOX,
  LOGO_LABEL,
  LOGO_ALL_PATHS,
} from "../../config/logo-paths";

export function StudioLogo() {
  return (
    <svg
      height="20"
      width="126"
      viewBox={LOGO_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={LOGO_LABEL}
      style={{ display: "block" }}
    >
      {LOGO_ALL_PATHS.map((d, i) => (
        <path key={i} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

export default StudioLogo;
