import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/shortcut")
@RenderMode("ssg")
@Locales("en")
export class ShortcutPage extends TypecaseDocPageBase {
    protected override readonly slug = "shortcut";
}
