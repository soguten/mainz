import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/code-block")
@RenderMode("ssg")
@Locales("en")
export class CodeBlockPage extends TypecaseDocPageBase {
    protected override readonly slug = "code-block";
}
