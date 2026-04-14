import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/image")
@RenderMode("ssg")
@Locales("en")
export class ImagePage extends TypecaseDocPageBase {
    protected override readonly slug = "image";
}
