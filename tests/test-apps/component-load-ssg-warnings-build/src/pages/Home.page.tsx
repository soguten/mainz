import { CustomElement, Page, RenderMode, Route } from "mainz";
import { ClientOnlyWithFallback } from "../components/ClientOnlyWithFallback.tsx";
import { DeferredWithFallback } from "../components/DeferredWithFallback.tsx";
import { DeferredWithoutFallback } from "../components/DeferredWithoutFallback.tsx";

@CustomElement("x-component-load-ssg-warnings-home-page")
@Route("/")
@RenderMode("ssg")
export class ComponentLoadSsgWarningsHomePage extends Page {
  override render() {
    return (
      <main>
        <h1>Component Load SSG Warnings</h1>
        <DeferredWithoutFallback />
        <DeferredWithFallback />
        <ClientOnlyWithFallback />
      </main>
    );
  }
}
