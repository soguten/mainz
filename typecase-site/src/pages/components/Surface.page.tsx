import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/surface")
@RenderMode("ssg")
@Locales("en")
export class SurfacePage extends TypecaseDocPageBase {
    protected override readonly slug = "surface";
}
