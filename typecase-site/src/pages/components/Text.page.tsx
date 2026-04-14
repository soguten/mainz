import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/text")
@RenderMode("ssg")
@Locales("en")
export class TextPage extends TypecaseDocPageBase {
    protected override readonly slug = "text";
}
