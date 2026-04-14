import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/switch")
@RenderMode("ssg")
@Locales("en")
export class SwitchPage extends TypecaseDocPageBase {
    protected override readonly slug = "switch";
}
