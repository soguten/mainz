import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/container")
@RenderMode("ssg")
@Locales("en")
export class ContainerPage extends TypecaseDocPageBase {
    protected override readonly slug = "container";
}
