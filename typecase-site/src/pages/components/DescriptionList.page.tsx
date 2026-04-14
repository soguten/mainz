import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/description-list")
@RenderMode("ssg")
@Locales("en")
export class DescriptionListPage extends TypecaseDocPageBase {
    protected override readonly slug = "description-list";
}
