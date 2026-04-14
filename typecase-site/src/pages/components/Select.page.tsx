import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/select")
@RenderMode("ssg")
@Locales("en")
export class SelectPage extends TypecaseDocPageBase {
    protected override readonly slug = "select";
}
