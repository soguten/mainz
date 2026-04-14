import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/accordion")
@RenderMode("ssg")
@Locales("en")
export class AccordionPage extends TypecaseDocPageBase {
    protected override readonly slug = "accordion";
}
