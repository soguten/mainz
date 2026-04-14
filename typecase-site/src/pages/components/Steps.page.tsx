import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/steps")
@RenderMode("ssg")
@Locales("en")
export class StepsPage extends TypecaseDocPageBase {
    protected override readonly slug = "steps";
}
