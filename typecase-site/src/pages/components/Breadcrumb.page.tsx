import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/breadcrumb")
@RenderMode("ssg")
@Locales("en")
export class BreadcrumbPage extends TypecaseDocPageBase {
    protected override readonly slug = "breadcrumb";
}
