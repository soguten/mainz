import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/dialog")
@RenderMode("ssg")
@Locales("en")
export class DialogPage extends TypecaseDocPageBase {
    protected override readonly slug = "dialog";
}
