import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/checkbox")
@RenderMode("ssg")
@Locales("en")
export class CheckboxPage extends TypecaseDocPageBase {
    protected override readonly slug = "checkbox";
}
