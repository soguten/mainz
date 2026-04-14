import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/divider")
@RenderMode("ssg")
@Locales("en")
export class DividerPage extends TypecaseDocPageBase {
    protected override readonly slug = "divider";
}
