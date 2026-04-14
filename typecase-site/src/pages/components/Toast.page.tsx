import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/toast")
@RenderMode("ssg")
@Locales("en")
export class ToastPage extends TypecaseDocPageBase {
    protected override readonly slug = "toast";
}
