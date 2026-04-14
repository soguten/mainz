import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/typecase-root")
@RenderMode("ssg")
@Locales("en")
export class TypecaseRootPage extends TypecaseDocPageBase {
    protected override readonly slug = "typecase-root";
}
