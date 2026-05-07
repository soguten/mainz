import { Authorize, type PageLoadContext, RenderMode, Route } from "mainz";
import { AuthorizeSiteFrame } from "../components/AuthorizeSiteFrame.tsx";
import { AuthorizeSitePage } from "../lib/AuthorizeSitePage.ts";
import { buildAuthorizeSiteShellData } from "../lib/page-data.ts";

@Route("/billing")
@RenderMode("csr")
@Authorize({ policy: "org-member" })
export class BillingPage extends AuthorizeSitePage {
  override async load(context: PageLoadContext) {
    return await buildAuthorizeSiteShellData({
      principal: context.principal,
      url: context.url,
    });
  }

  override head() {
    return {
      title: "Billing",
    };
  }

  override render(): HTMLElement {
    const shell = this.props.data;

    return (
      <AuthorizeSiteFrame
        shell={shell}
        eyebrow='Named policy: "org-member"'
        title="Policies stay in auth.policies"
        lead="The page decorator keeps only the policy name. The actual check is registered once at startup and reused for navigation and route access."
      >
        <section className="authorize-site-card-grid">
          <article className="authorize-site-card">
            <h2>Current claim</h2>
            <p>
              This route checks whether
              <span className="authorize-site-code">
                principal.claims.orgId
              </span>
              equals <span className="authorize-site-code">mainz</span>.
            </p>
            <div className="authorize-site-kv">
              <div className="authorize-site-kv-row">
                <span className="authorize-site-kv-label">Org claim</span>
                <span className="authorize-site-code">
                  {shell?.orgId ?? "none"}
                </span>
              </div>
            </div>
          </article>

          <article className="authorize-site-card">
            <h2>Why it matters</h2>
            <p>
              Role checks answer who the user is inside one org. Policies answer
              a broader question that can depend on claims, tenancy, or host
              logic.
            </p>
          </article>
        </section>

        <section className="authorize-site-note">
          If you sign in as{" "}
          <span className="authorize-site-code">Outside Guest</span>, this route
          disappears from the nav because the same policy also drives
          visibility. Typing the URL manually will still produce a runtime
          <span className="authorize-site-code">403 Forbidden</span>.
        </section>
      </AuthorizeSiteFrame>
    );
  }
}
