/**
 * The default "how it works" steps every service page shows when its own
 * file doesn't set `process`. Edit once per client; override per service in
 * src/content/services/<slug>.json.
 */
export const DEFAULT_PROCESS = {
  heading: "From first call to final walkthrough",
  steps: [
    {
      title: "Call or send the form",
      text: "Tell us about the project and what you have in mind.",
    },
    {
      title: "On-site visit",
      text: "We measure, look at the space and answer your questions.",
    },
    {
      title: "Written, fixed quote",
      text: "A clear price and schedule before any work starts.",
    },
    {
      title: "Build and walkthrough",
      text: "One crew, daily updates, and a final walkthrough together.",
    },
  ],
};
