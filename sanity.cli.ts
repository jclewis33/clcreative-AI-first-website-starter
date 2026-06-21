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
  studioHost: "your-studio",
  deployment: {
    // App backing https://<studioHost>.sanity.studio. Leave empty — the first
    // `sanity deploy` issues a new appId; write the returned value back here.
    appId: "",
  },
});
