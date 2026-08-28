---
name: component-api
description: The full component reference for this starter. Load BEFORE building or editing any page or section, or using/modifying any component - BaseLayout, Section, Layout, Grid, Heading, Text, Visual, Overlay, Button, ButtonWrapper, Card, BlogCard, CaseStudyCard, TestimonialCard, Accordion, AccordionItem, Tab, TabButton, TabPanel, Modal, Slider, Carousel, Marquee, ScrollReveal, Dropdown, Icon, Video, SkipLink, FormattedDate, PricingCard, PricingItem, Navbar, Footer, or the form family (Form, FormField, FormSelect, FormCheckbox, FormRadio, FormTextarea, FormRange, FormFieldset). Contains every prop table, slot contract, and the common page patterns (hero, card grid, blog listing, new page). Also the reference for nav items (NAV_MENU), the announcement banner (BANNER), and pill vs full-width nav.
---

# Component API Reference

Typed Astro components wrapping the CSS system. Every prop carries JSDoc —
editors show autocomplete and inline descriptions, and each component has a
`docs` prop holding its manual (hover it). `npm run check:hover` guards all of
those tooltips.

**Import pattern** — always via the `@/` alias:

```astro
import Section from "@/components/ui/Section.astro"; import Heading from
"@/components/ui/Heading.astro";
```

Read a reference **when you work with its components**:

| Reference                                                            | Components                                                                                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [references/layout-and-content.md](references/layout-and-content.md) | BaseLayout, Section, Layout, Grid, Heading, Text, Visual, Overlay, Button, ButtonWrapper, Card, BlogCard, Icon, Video, FormattedDate, PricingCard |
| [references/interactive.md](references/interactive.md)               | Accordion, Tab, Modal, Slider, Carousel, Marquee, ScrollReveal, Dropdown, SkipLink, Navbar                                                        |
| [references/forms.md](references/forms.md)                           | Form, FormField, FormSelect, FormCheckbox, FormRadio, FormTextarea, FormRange, FormFieldset                                                       |

**Directory map:** `src/components/ui/` (the primitives above),
`src/components/sections/` (CTASection, BlogPostGrid, CaseStudyGrid,
TestimonialsSlider, TestimonialsGrid, TestimonialShowcase, FAQ, HowItWorks,
StackingPanels, Services, SplitSection, …), `src/components/case-study/`
(block renderer + blocks), `src/components/global/` (Navbar, Footer, Head,
Logo, JsonLd), `src/components/templates/` (BlogPost/CaseStudy/GlossaryTerm
templates), `src/components/portabletext/` (Sanity rich-text renderers).

Live demos of every component: `/components` and `/style-guide`. Both are
**dev-only** — `DEV_ONLY_PATHS` (src/config/seo.shared.mjs) strips them from
the build, and the nav/footer links to `/components` are gated behind
`import.meta.env.DEV` in `src/data/site-structure.ts` (`DEV_NAV_LINKS` /
`DEV_FOOTER_LINKS`), so they never ship to a client site.

**Add a demo to `/components` for every new component**, and add its `id` to
that page's `COMPONENT_INDEX` so it appears in the page index. Its heading
convention: each section opens with an eyebrow (component name) plus an h2
(one-line description); a section demoing **more than one** component gives
each one an H2-_styled_ sub-heading (`tag="h3" variant="h2"` — h2 weight, h3
outline). Eyebrows still label the _variants_ of a single component. Section
components render their own `<Section>`, so they sit at the page root behind a
slim label section rather than nested.

## Common page patterns

### Adding a new page

```astro
---
// src/pages/new-page.astro
import BaseLayout from "@/layouts/BaseLayout.astro";
import Section from "@/components/ui/Section.astro";
import Heading from "@/components/ui/Heading.astro";
import Text from "@/components/ui/Text.astro";
---

<!-- Default theme is light (omit theme prop to use site default) -->
<BaseLayout title="New Page | Site Name" description="SEO description.">
  <!-- First section: no padding prop ('main' default); no page-top — nav is sticky -->
  <Section>
    <Heading tag="h1" variant="h1">New Page</Heading>
    <Text variant="large">Page intro text.</Text>
  </Section>
</BaseLayout>
```

New **static** pages also need a `PAGES` entry in
`src/data/site-structure.ts` — see the `seo-discoverability` skill.

### Hero section (first section on page)

```astro
<!-- Sticky nav → no page-top; no padding prop. minHeight drives hero height. -->
<Section theme="dark" minHeight id="hero">
  <Fragment slot="background">
    <Visual src={heroBg} alt="" variant="background" priority />
    <Overlay strength={75} />
  </Fragment>
  <Layout variant="stack-centered">
    <Heading tag="h1" variant="display-xl"
      >Page <strong>Headline</strong></Heading
    >
    <Text variant="large" align="center">Supporting text.</Text>
    <ButtonWrapper>
      <Button href="/contact" ariaLabel="Get started">Get Started</Button>
      <Button variant="secondary" href="/case-studies" ariaLabel="Learn more"
        >Learn More</Button
      >
    </ButtonWrapper>
  </Layout>
</Section>
```

### Standard content section

```astro
<!-- No padding prop — 'main' is the default and the standard rhythm -->
<Section theme="light">
  <Layout variant="columns" ratio="5-7" verticalAlign="center">
    <Heading variant="eyebrow">Section Label</Heading>
    <Heading tag="h2" variant="display-sm"
      >Section <strong>heading</strong></Heading
    >
    <Text slot="column2" variant="large">Body text for this section.</Text>
  </Layout>
</Section>
```

### Card grid section

```astro
<Section>
  <Heading tag="h2" variant="h2">Our Work</Heading>
  <Grid largeColumns={3} mediumColumns={2} smallColumns={1} rowGap={6}>
    <Card title="Project One" href="/work/one" ariaLabel="View Project One">
      <Visual slot="visual" src={img} alt="Project One" />
      <Text>Description.</Text>
    </Card>
  </Grid>
</Section>
```

### Card row carousel (zero-dependency)

```astro
<Section>
  <Heading tag="h2" variant="h2">Recent work</Heading>
  <Carousel label="Recent projects" slidesLg={3} slidesMd={2}>
    {
      projects.map((p) => (
        <Card title={p.title} href={p.href} ariaLabel={`View ${p.title}`}>
          <Visual slot="visual" src={p.image} alt={p.imageAlt} />
          <Text clamp={2}>{p.summary}</Text>
        </Card>
      ))
    }
  </Carousel>
</Section>
```

### Blog listing page (structure overview)

```astro
<Section theme="dark">
  <Fragment slot="background">
    <Visual src={heroImage} alt="" variant="background" priority />
    <Overlay strength={75} />
  </Fragment>
  <Layout variant="stack-centered">
    <Heading tag="h1" variant="display-sm">Blog</Heading>
    <Text variant="large" align="center">Blog description.</Text>
  </Layout>
</Section>

<!-- Featured post — 2-column reversed (image left, content right) -->
<Section>
  <Layout variant="columns-reversed" verticalAlign="center">
    <Layout variant="stack">
      <Heading tag="h2" variant="h2">{featured.title}</Heading>
      <Text variant="regular">{featured.description}</Text>
    </Layout>
    <Visual slot="column2" src={featured.image} alt="" ratio="landscape" />
  </Layout>
</Section>

<!-- Blog grid — 3 → 2 → 1 responsive -->
<Section>
  <Grid largeColumns={3} mediumColumns={2} smallColumns={1} rowGap={6}>
    {posts.map((post) => <BlogCard {...post} />)}
  </Grid>
</Section>
```

## Cross-component rules (apply everywhere)

- **Slots render once.** Components that inspect slot content capture it with
  `slotContent()` from `@/lib/slots` and emit the string with
  `<Fragment set:html>` — never render `<slot />` after calling
  `Astro.slots.render()` (that second render drops the hoisted script of
  every component inside). `Astro.slots.has()` stays fine for cheap
  "was it passed" checks.
- **The container spaces its children.** Section's `.u-container` is a flex
  column with `gap` (default `--space-8`); Layout columns have `rowGap`.
  Never add `marginBottom` between their direct children — retune the
  container's `gap`.
- **Empty renders nothing.** A `Section`, `Card` region, `Carousel`,
  `Dropdown`, or `AccordionItem` whose slots render nothing emits nothing.
  `render={false}` expresses the intent up front from data.
- **Alignment is the layout's job.** `stack-centered` centres its children —
  don't repeat `align="center"` on them, and ButtonWrapper deliberately has
  no align prop.
- **A ratio'd `<Visual>` sharing a column with other content needs
  `<Layout variant="stack">` around them** — otherwise the collapsed column
  can hand the image a definite height that beats its ratio. A `<Visual>`
  alone in its column, or `variant="background"`, is fine.
- Animation libraries are imported **per component** (no window globals);
  layout-changing components dispatch
  `document.dispatchEvent(new CustomEvent("scrolltrigger:refresh"))` instead
  of importing GSAP. Today GSAP is used only by: `animation.js` (dynamic
  import behind data-attribute checks), ScrollReveal, HowItWorks,
  StackingPanels, Services. Swiper is used only by Slider and
  TestimonialShowcase. Everything else — Tab, Accordion, Modal, Marquee,
  Carousel, Dropdown — is pure CSS + small hoisted scripts.
