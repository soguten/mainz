import { defineRoutes } from "mainz/config";

export default defineRoutes([
    {
        id: "home",
        path: "/",
        mode: "ssg",
        locales: ["en", "pt"],
        file: "./site/src/main.tsx",
    },
]);
