import { defineTargetBuild } from "mainz/config";

export default defineTargetBuild({
    profiles: {
        dev: {
            overridePageMode: "csr",
            overrideNavigation: "spa",
        },
        production: {},
        "plain-static": {
            overrideNavigation: "mpa",
        },
    },
});
