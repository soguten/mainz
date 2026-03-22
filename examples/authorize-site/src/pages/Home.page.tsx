import { type Principal, RenderMode, Route } from "mainz";
import { AuthorizeSiteFrame } from "../components/AuthorizeSiteFrame.tsx";
import { AuthorizeSitePage, loadAuthorizeSitePage } from "../lib/AuthorizeSitePage.ts";
import { listSessionPresets } from "../lib/session.ts";

@Route("/")
@RenderMode("csr")
export class HomePage extends AuthorizeSitePage {
    static override page = {
        head: {
            title: "Authorization Example",
        },
    };

    static async load({ principal, url }: { principal?: Principal; url: URL }) {
        return await loadAuthorizeSitePage({ principal, url });
    }

    override render(): HTMLElement {
        const shell = this.props.data;

        return (
            <AuthorizeSiteFrame
                shell={shell}
                eyebrow="First-party example"
                title="Keep auth rules on the owner"
                lead="This mini app shows page authorization, component authorization, runtime policies, and navigation that hides routes by reusing the same metadata."
            >
                <section className="authorize-site-card-grid">
                    <article className="authorize-site-card">
                        <h2>What to try</h2>
                        <p>
                            Visit{" "}
                            <span className="authorize-site-code">/login</span>, choose a persona,
                            and watch the navigation change as the resolved principal changes.
                        </p>
                    </article>

                    <article className="authorize-site-card">
                        <h2>Protected pages</h2>
                        <p>
                            <span className="authorize-site-code">/account</span>{" "}
                            uses plain authentication,{" "}
                            <span className="authorize-site-code">/billing</span>
                            uses the named <span className="authorize-site-code">org-member</span>
                            policy, and <span className="authorize-site-code">/reports</span>{" "}
                            uses the <span className="authorize-site-code">billing-admin</span>{" "}
                            role.
                        </p>
                    </article>

                    <article className="authorize-site-card">
                        <h2>Protected component</h2>
                        <p>
                            The account page always renders for authenticated users, but an
                            owner-only component appears only when the current principal carries the
                            <span className="authorize-site-code">owner</span> role.
                        </p>
                    </article>
                </section>

                <section className="authorize-site-panel">
                    <h2>Suggested personas</h2>
                    <div className="authorize-site-card-grid">
                        {listSessionPresets().map((preset) => (
                            <article key={preset.id} className="authorize-site-card">
                                <h3>{preset.label}</h3>
                                <p>{preset.description}</p>
                                <div className="authorize-site-kv">
                                    <div className="authorize-site-kv-row">
                                        <span className="authorize-site-kv-label">Landing</span>
                                        <span className="authorize-site-code">
                                            {preset.defaultPath}
                                        </span>
                                    </div>
                                    <div className="authorize-site-kv-row">
                                        <span className="authorize-site-kv-label">Roles</span>
                                        <span className="authorize-site-code">
                                            {preset.session.roles.join(", ")}
                                        </span>
                                    </div>
                                    <div className="authorize-site-kv-row">
                                        <span className="authorize-site-kv-label">Org</span>
                                        <span className="authorize-site-code">
                                            {preset.session.orgId}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </AuthorizeSiteFrame>
        );
    }
}
