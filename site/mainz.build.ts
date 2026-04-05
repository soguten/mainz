import { defineTargetBuild } from "mainz/config";

export default defineTargetBuild({
    profiles: {
        dev: {
            overrideNavigation: "spa",
        },
        production: {},
        "plain-static": {
            overrideNavigation: "mpa",
        },
        "gh-pages": {
            // Published at the domain root.
            basePath: "/",
            // Used by to generate hreflang with absolute url
            siteUrl: "https://mainz.dev",
        },
    },
});
