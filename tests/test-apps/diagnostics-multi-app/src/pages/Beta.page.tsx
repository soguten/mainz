import { Page, Route } from "mainz";

@Route("/beta")
export class BetaPage extends Page {
  override render() {
    return <div>Beta</div>;
  }
}
