import { defineTargetBuild } from "mainz/config";

export default defineTargetBuild({
    profiles: {
        dev: {
            overridePageMode: "csr",
        },
        "gh-pages": {
            basePath: "/mainz/",
        },
    },
});
