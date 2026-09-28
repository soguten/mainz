import { Page, RenderMode, Route } from "mainz";

let moduleRenderCount = 0;

@Route("/")
@RenderMode("ssr")
export class HomePage extends Page {
  override render() {
    moduleRenderCount++;
    return <main>SSR Build App render {moduleRenderCount}</main>;
  }
}
