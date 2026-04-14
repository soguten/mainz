import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/topbar")
@RenderMode("ssg")
@Locales("en")
export class TopbarPage extends TypecaseDocPageBase {
    protected override readonly slug = "topbar";
}
