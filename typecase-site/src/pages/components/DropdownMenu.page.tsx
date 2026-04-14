import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/dropdown-menu")
@RenderMode("ssg")
@Locales("en")
export class DropdownMenuPage extends TypecaseDocPageBase {
    protected override readonly slug = "dropdown-menu";
}
