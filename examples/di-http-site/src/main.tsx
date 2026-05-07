import { startApp } from "mainz";
import { mockApp } from "./app.mock.ts";
import { app } from "./app.ts";
import { readBackendMode } from "./lib/runtime.ts";

const backendMode = readBackendMode();

startApp(backendMode === "mock" ? mockApp : app, {
  mount: "#app",
});
