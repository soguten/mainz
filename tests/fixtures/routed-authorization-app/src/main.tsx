import { defineApp, startApp } from "mainz";
import type { Principal } from "mainz";
import { LoginPage } from "./pages/Login.page.tsx";
import { MemberDashboardPage } from "./pages/MemberDashboard.page.tsx";
import { AdminVaultPage } from "./pages/AdminVault.page.tsx";

const app = defineApp({
    id: "routed-authorization-app",
    i18n: {
        locales: ["en", "pt"],
        defaultLocale: "en",
        localePrefix: "except-default",
    },
    pages: [LoginPage, MemberDashboardPage, AdminVaultPage],
});

startApp(app, {
    mount: "#app",
    auth: {
        loginPath: "/login",
        async getPrincipal(): Promise<Principal> {
            const pathname = globalThis.location?.pathname ?? "/";

            if (pathname.includes("/admin")) {
                return {
                    authenticated: true,
                    id: "member-1",
                    roles: ["member"],
                    claims: {},
                };
            }

            return {
                authenticated: false,
                roles: [],
                claims: {},
            };
        },
    },
});
