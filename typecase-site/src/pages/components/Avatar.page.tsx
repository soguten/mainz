import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/avatar")
@RenderMode("ssg")
@Locales("en")
export class AvatarPage extends TypecaseDocPageBase {
    protected override readonly slug = "avatar";
}
