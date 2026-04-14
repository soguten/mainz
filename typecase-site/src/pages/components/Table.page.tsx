import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/table")
@RenderMode("ssg")
@Locales("en")
export class TablePage extends TypecaseDocPageBase {
    protected override readonly slug = "table";
}
