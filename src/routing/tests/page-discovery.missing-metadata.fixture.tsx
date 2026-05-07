import { Page } from "../../index.ts";

export class BrokenPage extends Page {
  override render(): HTMLElement {
    return <main>Broken</main>;
  }
}
