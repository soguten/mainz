import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/input")
@RenderMode("ssg")
@Locales("en")
export class InputPage extends TypecaseDocPageBase {
    protected override readonly slug = "input";
}
