import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/badge")
@RenderMode("ssg")
@Locales("en")
export class BadgePage extends TypecaseDocPageBase {
    protected override readonly slug = "badge";
}
