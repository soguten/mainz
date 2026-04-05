import { defineApp, startApp } from "mainz";
import { authorizeSitePolicies, getAuthorizeSitePrincipal } from "./lib/session.ts";
import { AccountPage } from "./pages/Account.page.tsx";
import { BillingPage } from "./pages/Billing.page.tsx";
import { HomePage } from "./pages/Home.page.tsx";
import { LoginPage } from "./pages/Login.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";
import { ReportsPage } from "./pages/Reports.page.tsx";

const app = defineApp({
    id: "authorize-site",
    navigation: "spa",
    pages: [HomePage, LoginPage, AccountPage, BillingPage, ReportsPage],
    notFound: NotFoundPage,
});

startApp(app, {
    mount: "#app",
    auth: {
        loginPath: "/login",
        getPrincipal: getAuthorizeSitePrincipal,
        policies: authorizeSitePolicies,
    },
});
