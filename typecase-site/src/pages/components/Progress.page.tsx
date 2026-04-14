import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/progress")
@RenderMode("ssg")
@Locales("en")
export class ProgressPage extends TypecaseDocPageBase {
    protected override readonly slug = "progress";
}
