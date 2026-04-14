import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/label")
@RenderMode("ssg")
@Locales("en")
export class LabelPage extends TypecaseDocPageBase {
    protected override readonly slug = "label";
}
