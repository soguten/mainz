import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/dropdown")
@RenderMode("ssg")
@Locales("en")
export class DropdownPage extends TypecaseDocPageBase {
    protected override readonly slug = "dropdown";
}
