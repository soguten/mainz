import { CustomElement, Page, Route } from "mainz";

@CustomElement("x-mainz-not-found-csr-default-home-page")
@Route("/")
export class HomePage extends Page {
  override render() {
    return <main>Home</main>;
  }
}
