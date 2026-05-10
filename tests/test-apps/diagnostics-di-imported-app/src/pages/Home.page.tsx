import { Page, RenderMode, Route } from "mainz";

@Route("/")
@RenderMode("csr")
export class DiagnosticsImportedAppPage extends Page {
  render() {
    return <div>Imported app</div>;
  }
}
