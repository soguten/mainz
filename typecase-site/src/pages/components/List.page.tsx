import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/list")
@RenderMode("ssg")
@Locales("en")
export class ListPage extends TypecaseDocPageBase {
    protected override readonly slug = "list";
}
