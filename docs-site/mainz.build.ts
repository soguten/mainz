import { defineTargetBuild } from "mainz/config";

export default defineTargetBuild({
    profiles: {
        dev: {},
        production: {},
        "plain-static": {},
        "gh-pages": {
            // Published under the docs subpath.
            basePath: "/docs/",
            siteUrl: "https://mainz.dev",
        },
    },
});
