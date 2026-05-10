import { startApp } from "mainz";
import { alphaRootApp, betaRootApp } from "./roots.tsx";

const selectedApp = true ? betaRootApp : alphaRootApp;

startApp(selectedApp, {
  mount: "#app",
});
