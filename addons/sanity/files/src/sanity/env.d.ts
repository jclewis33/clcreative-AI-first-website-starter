/// <reference types="@sanity/astro/module" />

// Build-time constant, replaced by `vite.define` (viteDefine in
// src/config/cms.mjs) from process.env.PARITY_FIXTURES ("" in a normal
// build). Read only by src/sanity/lib/load-query.ts, page-data.ts and
// fixtures/index.ts to switch on the parity fixtures.
declare const __PARITY_FIXTURES__: string;
