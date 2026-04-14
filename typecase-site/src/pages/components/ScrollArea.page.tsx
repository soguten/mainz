import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/scroll-area")
@RenderMode("ssg")
@Locales("en")
export class ScrollAreaPage extends TypecaseDocPageBase {
    protected override readonly slug = "scroll-area";
}
