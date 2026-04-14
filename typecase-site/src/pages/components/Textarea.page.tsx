import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/textarea")
@RenderMode("ssg")
@Locales("en")
export class TextareaPage extends TypecaseDocPageBase {
    protected override readonly slug = "textarea";
}
