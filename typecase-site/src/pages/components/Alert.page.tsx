import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/alert")
@RenderMode("ssg")
@Locales("en")
export class AlertPage extends TypecaseDocPageBase {
    protected override readonly slug = "alert";
}
