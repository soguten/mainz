import { type Principal, RenderMode, Route } from "mainz";
import { AuthorizeSiteFrame } from "../components/AuthorizeSiteFrame.tsx";
import { AuthorizeSitePage, loadAuthorizeSitePage } from "../lib/AuthorizeSitePage.ts";

@Route("/404")
@RenderMode("ssg")
export class NotFoundPage extends AuthorizeSitePage {
    static override page = {
        notFound: true,
        head: {
            title: "Not Found",
        },
    };

    static async load({ principal, url }: { principal?: Principal; url: URL }) {
        return await loadAuthorizeSitePage({ principal, url });
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
