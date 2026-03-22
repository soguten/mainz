import {
    AllowAnonymous,
    Authorize,
    CustomElement,
    Page,
    RenderMode,
    Route,
} from "../../index.ts";

@CustomElement("x-mainz-page-discovery-admin-page")
@Authorize({ roles: ["admin"], policy: "org-member" })
@Route("/admin")
@RenderMode("csr")
export class AdminPage extends Page {}

@CustomElement("x-mainz-page-discovery-anonymous-page")
@AllowAnonymous()
@Route("/signin")
@RenderMode("ssg")
export class SignInPage extends Page {}
