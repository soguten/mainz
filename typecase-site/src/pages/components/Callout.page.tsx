import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/callout")
@RenderMode("ssg")
@Locales("en")
export class CalloutPage extends TypecaseDocPageBase {
    protected override readonly slug = "callout";
}
