import { RenderMode, Route } from "mainz";
import { DiHttpFrame } from "../components/DiHttpFrame.tsx";
import { DiHttpExamplePage } from "../lib/DiHttpExamplePage.ts";

@RenderMode("ssg")
export class NotFoundPage extends DiHttpExamplePage {
  override head() {
    return {
      title: "DI + HTTP Example | Not Found",
    };
  }

  override render() {
    return (
      <DiHttpFrame
        eyebrow="Missing route"
        title="That story is not in the example set"
        lead="The DI example stays tiny on purpose, so unknown story slugs fall back to the example-level notFound page."
      >
        <section className="di-http-panel">
          <p>Try one of the featured story routes instead.</p>
          <div className="di-http-story-nav">
            <a href="/">Go back home</a>
            <a href="/stories/dependency-map">Open the first story</a>
          </div>
        </section>
      </DiHttpFrame>
    );
  }
}
