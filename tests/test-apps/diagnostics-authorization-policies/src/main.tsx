import { defineApp, startApp } from "mainz";
import { OrgPage } from "./pages/Org.page.tsx";

const app = defineApp({
  id: "diagnostics-authorization-policies",
  authorization: {
    policyNames: ["org-member"],
  },
  pages: [OrgPage],
});

startApp(app);
