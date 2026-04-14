import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/button")
@RenderMode("ssg")
@Locales("en")
export class ButtonPage extends TypecaseDocPageBase {
    protected override readonly slug = "button";
}
