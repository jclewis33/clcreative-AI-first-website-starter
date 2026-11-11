/**
 * Pages a preset adds beyond the starter's own — written by `npm run demo`
 * (scripts/demo.mjs) for the local-service preset's /about. Empty in the
 * starter and on any site that isn't built from a preset. site-structure.ts
 * merges these into PAGES, NAV_MENU and the footer's Company column, so the
 * registry stays hand-written and the preset never edits it.
 */
import type { FooterLink, NavMenuItem, SitePage } from "./site-structure";
import type { ProjectsPageCopy } from "./preset-pages-types";

export const PRESET_PAGES: SitePage[] = [];
export const PRESET_NAV: NavMenuItem[] = [];
export const PRESET_FOOTER: FooterLink[] = [];
/** Links that head a service group's menu ({ Commercial: ["/commercial"] }). */
export const PRESET_GROUP_LINKS: Record<string, string[]> = {};

export const PRESET_PROJECTS_PAGE: ProjectsPageCopy | null = null;
