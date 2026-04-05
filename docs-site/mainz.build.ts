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
            // Published under the docs subpath.
            basePath: "/docs/",
            siteUrl: "https://mainz.dev",
        },
    },
});
