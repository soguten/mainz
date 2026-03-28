import {
    AllowAnonymous,
    Authorize,
    CustomElement,
    Page,
    RenderMode,
    Route,
} from "../../index.ts";

abstract class PageDiscoveryFixturePage extends Page {
    override render() {
        return <div></div>;
    }
}

@CustomElement("x-mainz-page-discovery-admin-page")
@Authorize({ roles: ["admin"], policy: "org-member" })
@Route("/admin")
@RenderMode("csr")
export class AdminPage extends PageDiscoveryFixturePage {}

@CustomElement("x-mainz-page-discovery-anonymous-page")
@AllowAnonymous()
@Route("/signin")
@RenderMode("ssg")
export class SignInPage extends PageDiscoveryFixturePage {}
