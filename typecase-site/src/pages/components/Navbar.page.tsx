import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/navbar")
@RenderMode("ssg")
@Locales("en")
export class NavbarPage extends TypecaseDocPageBase {
    protected override readonly slug = "navbar";
}
