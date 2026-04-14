import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/spacer")
@RenderMode("ssg")
@Locales("en")
export class SpacerPage extends TypecaseDocPageBase {
    protected override readonly slug = "spacer";
}
