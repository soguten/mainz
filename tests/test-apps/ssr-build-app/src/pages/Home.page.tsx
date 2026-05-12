import { Page, RenderMode, Route } from "mainz";

@Route("/")
@RenderMode("ssr")
export class HomePage extends Page {
  override render() {
    return <main>SSR Build App</main>;
  }
}
