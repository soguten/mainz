import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/inset")
@RenderMode("ssg")
@Locales("en")
export class InsetPage extends TypecaseDocPageBase {
    protected override readonly slug = "inset";
}
