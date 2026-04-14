import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/card")
@RenderMode("ssg")
@Locales("en")
export class CardPage extends TypecaseDocPageBase {
    protected override readonly slug = "card";
}
