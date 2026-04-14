import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/pagination")
@RenderMode("ssg")
@Locales("en")
export class PaginationPage extends TypecaseDocPageBase {
    protected override readonly slug = "pagination";
}
