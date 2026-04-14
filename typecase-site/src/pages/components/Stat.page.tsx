import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/stat")
@RenderMode("ssg")
@Locales("en")
export class StatPage extends TypecaseDocPageBase {
    protected override readonly slug = "stat";
}
