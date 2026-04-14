import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/empty-state")
@RenderMode("ssg")
@Locales("en")
export class EmptyStatePage extends TypecaseDocPageBase {
    protected override readonly slug = "empty-state";
}
