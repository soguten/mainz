import { Authorize, CustomElement, Page, Route } from "mainz";

@CustomElement("x-mainz-diagnostics-authorization-org-page")
@Route("/org")
@Authorize({ policy: "org-member" })
export class OrgPage extends Page {}
