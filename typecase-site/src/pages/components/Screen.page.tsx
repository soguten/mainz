import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/screen")
@RenderMode("ssg")
@Locales("en")
export class ScreenPage extends TypecaseDocPageBase {
    protected override readonly slug = "screen";
}
