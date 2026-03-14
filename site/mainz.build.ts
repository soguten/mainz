import { defineTargetBuild } from "mainz/config";

export default defineTargetBuild({
    profiles: {
        dev: {
            overridePageMode: "csr",
        },
        production: {},
        "gh-pages": {
            // Published at the domain root.
            basePath: "/",
            siteUrl: "https://mainz.soguten.com",
        },
    },
});
