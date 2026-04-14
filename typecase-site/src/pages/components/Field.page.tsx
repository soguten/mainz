import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/field")
@RenderMode("ssg")
@Locales("en")
export class FieldPage extends TypecaseDocPageBase {
    protected override readonly slug = "field";
}
