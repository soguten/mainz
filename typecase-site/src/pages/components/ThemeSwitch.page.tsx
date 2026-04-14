import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/theme-switch")
@RenderMode("ssg")
@Locales("en")
export class ThemeSwitchPage extends TypecaseDocPageBase {
    protected override readonly slug = "theme-switch";
}
