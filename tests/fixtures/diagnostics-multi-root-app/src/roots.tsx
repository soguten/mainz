import { Component, CustomElement, defineApp } from "mainz";
import { inject, singleton } from "mainz/di";
import { SharedApi } from "./services.ts";

@CustomElement("x-diagnostics-multi-root")
export class DiagnosticsMultiRootApp extends Component {
  readonly api = inject(SharedApi);

  override render() {
    return <main>{this.api.constructor.name}</main>;
  }
}

export const alphaRootApp = defineApp({
  id: "alpha-root-app",
  root: DiagnosticsMultiRootApp,
});

export const betaRootApp = defineApp({
  id: "beta-root-app",
  root: DiagnosticsMultiRootApp,
  services: [
    singleton(SharedApi),
  ],
});
