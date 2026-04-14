import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/icons")
@RenderMode("ssg")
@Locales("en")
export class IconsPage extends TypecaseDocPageBase {
    protected override readonly slug = "icons";
}
