import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/stack")
@RenderMode("ssg")
@Locales("en")
export class StackPage extends TypecaseDocPageBase {
    protected override readonly slug = "stack";
}
