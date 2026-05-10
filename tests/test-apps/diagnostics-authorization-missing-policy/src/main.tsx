import { defineApp, startApp } from "mainz";
import { OrgPage } from "./pages/Org.page.tsx";

const app = defineApp({
  id: "diagnostics-authorization-missing-policy",
  pages: [OrgPage],
});

startApp(app);
