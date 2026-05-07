import { Authorize, CustomElement, Page, Route } from "mainz";

abstract class DiagnosticsAuthorizationMissingPolicyPage extends Page {
  override render() {
    return <div></div>;
  }
}

@CustomElement("x-mainz-diagnostics-authorization-missing-policy-org-page")
@Route("/org")
@Authorize({ policy: "org-member" })
export class OrgPage extends DiagnosticsAuthorizationMissingPolicyPage {}
