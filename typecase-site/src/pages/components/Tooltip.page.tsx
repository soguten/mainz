import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/tooltip")
@RenderMode("ssg")
@Locales("en")
export class TooltipPage extends TypecaseDocPageBase {
    protected override readonly slug = "tooltip";
}
