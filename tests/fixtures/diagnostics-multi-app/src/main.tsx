import { startApp } from "mainz";
import { alphaApp, betaApp } from "./apps.ts";

const selectedApp = true ? betaApp : alphaApp;

startApp(selectedApp, {
    mount: "#app",
});
