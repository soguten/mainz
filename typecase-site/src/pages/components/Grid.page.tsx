import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/grid")
@RenderMode("ssg")
@Locales("en")
export class GridPage extends TypecaseDocPageBase {
    protected override readonly slug = "grid";
}
