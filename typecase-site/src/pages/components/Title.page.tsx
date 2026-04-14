import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/title")
@RenderMode("ssg")
@Locales("en")
export class TitlePage extends TypecaseDocPageBase {
    protected override readonly slug = "title";
}
