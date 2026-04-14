import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/section")
@RenderMode("ssg")
@Locales("en")
export class SectionPage extends TypecaseDocPageBase {
    protected override readonly slug = "section";
}
