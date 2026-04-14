import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/kbd")
@RenderMode("ssg")
@Locales("en")
export class KbdPage extends TypecaseDocPageBase {
    protected override readonly slug = "kbd";
}
