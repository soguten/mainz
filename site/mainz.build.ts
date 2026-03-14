import { defineTargetBuild } from "mainz/config";

export default defineTargetBuild({
    profiles: {
        dev: {
            overridePageMode: "csr",
        },
        "gh-pages": {
            // Published at the domain root.
            basePath: "/",
        },
    },
});
