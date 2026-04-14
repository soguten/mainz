import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/on-this-page")
@RenderMode("ssg")
@Locales("en")
export class OnThisPagePage extends TypecaseDocPageBase {
    protected override readonly slug = "on-this-page";
}
