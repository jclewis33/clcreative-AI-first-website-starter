/**
 * The call-to-action shape every section uses for its buttons.
 *
 * A CTA either links somewhere (`href`) or opens a `<Modal>` on the page
 * (`modal` = the modal's id, e.g. a `<LeadFormModal id="estimate-modal">`). With
 * `modal` set, `href` is ignored. Render one with `<CtaButton cta={…} />`.
 */
export interface SectionCta {
  /** Button text. */
  label: string;
  /** Link target. Ignored when `modal` is set. */
  href?: string;
  /** Id of a `<Modal>` to open instead of navigating. */
  modal?: string;
}

/**
 * The id of the site-wide estimate form modal. BaseLayout renders it on
 * every page when `SITE.quote` is set; the navbar, the mobile action bar and
 * the local-service templates open it with `{ modal: ESTIMATE_MODAL_ID }`.
 */
export const ESTIMATE_MODAL_ID = "estimate-modal";
