import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/show")
@RenderMode("ssg")
@Locales("en")
export class ShowPage extends TypecaseDocPageBase {
    protected override readonly slug = "show";
}
