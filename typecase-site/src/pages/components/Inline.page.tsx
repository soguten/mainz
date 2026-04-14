import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/inline")
@RenderMode("ssg")
@Locales("en")
export class InlinePage extends TypecaseDocPageBase {
    protected override readonly slug = "inline";
}
