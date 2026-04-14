import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/split")
@RenderMode("ssg")
@Locales("en")
export class SplitPage extends TypecaseDocPageBase {
    protected override readonly slug = "split";
}
