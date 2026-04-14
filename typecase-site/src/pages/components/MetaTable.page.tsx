import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/meta-table")
@RenderMode("ssg")
@Locales("en")
export class MetaTablePage extends TypecaseDocPageBase {
    protected override readonly slug = "meta-table";
}
