import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/snippet")
@RenderMode("ssg")
@Locales("en")
export class SnippetPage extends TypecaseDocPageBase {
    protected override readonly slug = "snippet";
}
