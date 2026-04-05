import { type PageLoadContext, RenderMode } from "mainz";
import { AuthorizeSiteFrame } from "../components/AuthorizeSiteFrame.tsx";
import { AuthorizeSitePage } from "../lib/AuthorizeSitePage.ts";
import { buildAuthorizeSiteShellData } from "../lib/page-data.ts";

@RenderMode("ssg")
export class NotFoundPage extends AuthorizeSitePage {
    
    override async load(context: PageLoadContext) {
        return await buildAuthorizeSiteShellData({
            principal: context.principal,
            url: context.url,
        });
    }

    override head() {
        return {
            title: "Not Found",
        };
    }

    override render(): HTMLElement {
        return (
            <AuthorizeSiteFrame
                shell={this.props.data}
                eyebrow="Missing route"
                title="This example page does not exist"
                lead="The authorization demo still keeps the surrounding shell, so you can return to a visible route without losing context."
            >
                <section className="authorize-site-panel">
                    <h2>Try one of the visible routes above</h2>
                    <p>
                        The navigation continues to reflect the current principal even on the
                        fallback page.
                    </p>
                    <div className="authorize-site-inline-links">
                        <a className="authorize-site-link-chip" href="/">
                            Back home
                        </a>
                        <a className="authorize-site-link-chip" href="/login">
                            Switch session
                        </a>
                    </div>
                </section>
            </AuthorizeSiteFrame>
        );
    }
}
