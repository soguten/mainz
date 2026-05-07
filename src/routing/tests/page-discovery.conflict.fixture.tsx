import { Page, RenderMode, Route } from "../../index.ts";

@Route("/conflict")
@RenderMode("csr")
export class ConflictingPage extends Page {
  override render(): HTMLElement {
    return <main>Conflict</main>;
  }
}
