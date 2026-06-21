/**
 * Document-level Studio customizations wired up in sanity.config.ts:
 *
 *  - ViewOnSiteAction — a document action that opens the live published page
 *    in a new tab (blog/case-study/glossary by slug). For coming-soon case
 *    studies (whose detail page is hidden) it opens the external Live URL.
 *  - FeaturedBadge / ComingSoonBadge — status labels shown in the document
 *    header so editors can see at a glance what's promoted or still teased.
 */
import { EarthGlobeIcon } from "@sanity/icons";
import type {
  DocumentActionComponent,
  DocumentActionProps,
  DocumentBadgeComponent,
  DocumentBadgeProps,
} from "sanity";
import { SITE_URL } from "../../config/site";

const ROUTE_BY_TYPE: Record<string, string> = {
  blogPost: "/blog",
  caseStudy: "/case-studies",
  glossaryTerm: "/glossary",
};

type PreviewDoc = {
  slug?: { current?: string };
  comingSoon?: boolean;
  liveUrl?: string;
};

function liveUrlFor(
  props: DocumentActionProps | DocumentBadgeProps,
): string | null {
  const doc = (props.published ?? props.draft) as PreviewDoc | null;
  if (!doc) return null;
  // Coming-soon case studies have no live detail page — link the external site.
  if (props.type === "caseStudy" && doc.comingSoon) {
    return doc.liveUrl ?? null;
  }
  const base = ROUTE_BY_TYPE[props.type];
  const slug = doc.slug?.current;
  if (!base || !slug) return null;
  return `${SITE_URL}${base}/${slug}`;
}

export const ViewOnSiteAction: DocumentActionComponent = (props) => {
  const url = liveUrlFor(props);
  if (!url) return null;
  return {
    label: "View on site",
    icon: EarthGlobeIcon,
    onHandle: () => {
      window.open(url, "_blank", "noopener,noreferrer");
      props.onComplete();
    },
  };
};

export const FeaturedBadge: DocumentBadgeComponent = (props) => {
  const doc = (props.published ?? props.draft) as { featured?: boolean } | null;
  if (!doc?.featured) return null;
  return { label: "Featured", color: "primary" };
};

export const ComingSoonBadge: DocumentBadgeComponent = (props) => {
  const doc = (props.published ?? props.draft) as {
    comingSoon?: boolean;
  } | null;
  if (!doc?.comingSoon) return null;
  return { label: "Coming Soon", color: "warning" };
};
