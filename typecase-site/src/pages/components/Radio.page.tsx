import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/radio")
@RenderMode("ssg")
@Locales("en")
export class RadioPage extends TypecaseDocPageBase {
    protected override readonly slug = "radio";
}
