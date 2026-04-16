import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/quick-menu")
@RenderMode("ssg")
@Locales("en")
export class QuickMenuPage extends TypecaseDocPageBase {
    protected override readonly slug = "quick-menu";
}
