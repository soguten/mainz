import { Page, Route } from "mainz";
import { inject } from "mainz/di";
import { SharedApi } from "../services.ts";

@Route("/alpha")
export class AlphaPage extends Page {
    static readonly api = inject(SharedApi);

    override render() {
        return <div>Alpha</div>;
    }
}
