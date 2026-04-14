import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/skeleton")
@RenderMode("ssg")
@Locales("en")
export class SkeletonPage extends TypecaseDocPageBase {
    protected override readonly slug = "skeleton";
}
