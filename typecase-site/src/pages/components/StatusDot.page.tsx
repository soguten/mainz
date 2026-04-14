import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/status-dot")
@RenderMode("ssg")
@Locales("en")
export class StatusDotPage extends TypecaseDocPageBase {
    protected override readonly slug = "status-dot";
}
