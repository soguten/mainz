import { defineTargetBuild } from "mainz/config";

export default defineTargetBuild({
    profiles: {
        dev: {
            navigation: "spa",
        },
        production: {},
        "plain-static": {
            navigation: "mpa",
        },
        "gh-pages": {
            // Published under the docs subpath.
            basePath: "/docs/",
            siteUrl: "https://mainz.dev",
        },
    },
});
