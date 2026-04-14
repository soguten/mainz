import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/tabs")
@RenderMode("ssg")
@Locales("en")
export class TabsPage extends TypecaseDocPageBase {
    protected override readonly slug = "tabs";
}
