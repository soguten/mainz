import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/fieldset")
@RenderMode("ssg")
@Locales("en")
export class FieldsetPage extends TypecaseDocPageBase {
    protected override readonly slug = "fieldset";
}
