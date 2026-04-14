import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/offcanvas")
@RenderMode("ssg")
@Locales("en")
export class OffcanvasPage extends TypecaseDocPageBase {
    protected override readonly slug = "offcanvas";
}
