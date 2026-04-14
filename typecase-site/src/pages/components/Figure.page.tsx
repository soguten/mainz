import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/figure")
@RenderMode("ssg")
@Locales("en")
export class FigurePage extends TypecaseDocPageBase {
    protected override readonly slug = "figure";
}
