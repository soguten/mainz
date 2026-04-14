import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/anchor")
@RenderMode("ssg")
@Locales("en")
export class AnchorPage extends TypecaseDocPageBase {
    protected override readonly slug = "anchor";
}
