import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/link-box")
@RenderMode("ssg")
@Locales("en")
export class LinkBoxPage extends TypecaseDocPageBase {
    protected override readonly slug = "link-box";
}
