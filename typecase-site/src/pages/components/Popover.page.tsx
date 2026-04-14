import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/popover")
@RenderMode("ssg")
@Locales("en")
export class PopoverPage extends TypecaseDocPageBase {
    protected override readonly slug = "popover";
}
