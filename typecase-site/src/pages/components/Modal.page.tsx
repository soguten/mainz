import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/modal")
@RenderMode("ssg")
@Locales("en")
export class ModalPage extends TypecaseDocPageBase {
    protected override readonly slug = "modal";
}
