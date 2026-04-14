import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/drawer")
@RenderMode("ssg")
@Locales("en")
export class DrawerPage extends TypecaseDocPageBase {
    protected override readonly slug = "drawer";
}
