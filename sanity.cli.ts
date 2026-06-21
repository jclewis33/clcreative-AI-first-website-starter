import { defineCliConfig } from "sanity/cli";
import {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
} from "./src/config/site.shared.mjs";

export default defineCliConfig({
  api: {
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
  },
  studioHost: "clcreative",
  deployment: {
    // App backing https://clcreative.sanity.studio (issued by `sanity deploy`).
    appId: "x5ftewwzfgt17sngx8ntsjor",
  },
});
