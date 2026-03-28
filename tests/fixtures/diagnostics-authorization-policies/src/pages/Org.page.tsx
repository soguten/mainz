import { Authorize, CustomElement, Page, Route } from "mainz";

abstract class DiagnosticsAuthorizationFixturePage extends Page {
    override render() {
        return <div></div>;
    }
}

@CustomElement("x-mainz-diagnostics-authorization-org-page")
@Route("/org")
@Authorize({ policy: "org-member" })
export class OrgPage extends DiagnosticsAuthorizationFixturePage {}
