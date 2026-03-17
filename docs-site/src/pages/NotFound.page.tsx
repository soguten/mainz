import { Page, route } from "mainz";
import { DocsShell } from "../components/DocsShell.tsx";
import { getDocsNavSections } from "../lib/docs.ts";

@route("/404")
export class NotFoundPage extends Page {
    static override customElementTag = "x-mainz-docs-not-found-page";

    static override page = {
        mode: "ssg" as const,
        notFound: true,
        locales: ["en"],
        head: {
            title: "404 | Mainz Docs",
            meta: [
                {
                    name: "description",
                    content: "The requested page was not found in the Mainz Docs demo.",
                },
            ],
        },
    };

    override render() {
        return (
            <DocsShell
                title="That page never made it into the docs"
                summary="The URL is outside this demo site, so Mainz is rendering the custom notFound page instead of falling back to a generic server response."
                navSections={getDocsNavSections()}
                activeSlug={undefined}
                markdown={`
## Get back to a known page

Start from the overview or jump directly to one of the core documentation articles in the left navigation.

This page uses the same shell and theme system as the rest of the docs so the failure mode still feels intentional.
`}
                statusLabel="Not found"
            />
        );
    }
}
