import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/spinner")
@RenderMode("ssg")
@Locales("en")
export class SpinnerPage extends TypecaseDocPageBase {
    protected override readonly slug = "spinner";
}
