import { defineTargetBuild } from "mainz/config";

export default defineTargetBuild({
    profiles: {
        dev: {},
        production: {},
        "plain-static": {},
        "gh-pages": {
            // Published at the domain root.
            basePath: "/",
            // Used by to generate hreflang with absolute url
            siteUrl: "https://mainz.dev",
        }
    },
});
