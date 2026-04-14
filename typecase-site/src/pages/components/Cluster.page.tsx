import { Locales, RenderMode, Route } from "mainz";
import { TypecaseDocPageBase } from "../../lib/TypecaseDocPageBase.tsx";

@Route("/components/cluster")
@RenderMode("ssg")
@Locales("en")
export class ClusterPage extends TypecaseDocPageBase {
    protected override readonly slug = "cluster";
}
