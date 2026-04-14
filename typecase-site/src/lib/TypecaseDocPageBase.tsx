import { Page } from "mainz";
import { TypecaseComponentDocsPage } from "../components/TypecaseComponentDocsPage.tsx";
import { getTypecaseDocBySlug } from "./typecase-docs.tsx";

export abstract class TypecaseDocPageBase extends Page {
    protected abstract readonly slug: string;

    override head() {
        const doc = getTypecaseDocBySlug(this.slug);

        return {
            title: doc ? `${doc.title} | Typecase` : "Typecase | Component not found",
            meta: [
                {
                    name: "description",
                    content: doc?.summary ?? "Typecase component documentation.",
                },
            ],
        };
    }

    override render() {
        return <TypecaseComponentDocsPage slug={this.slug} />;
    }
}
