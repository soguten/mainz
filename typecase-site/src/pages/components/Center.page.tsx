import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/center")
@RenderMode("ssg")
@Locales("en")
export class CenterPage extends TypecaseDocPageBase {
    protected override readonly slug = "center";
}
