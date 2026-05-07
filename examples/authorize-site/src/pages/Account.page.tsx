import { Authorize, type PageLoadContext, RenderMode, Route } from "mainz";
import { AuthorizeSiteFrame } from "../components/AuthorizeSiteFrame.tsx";
import { OwnerTools } from "../components/OwnerTools.tsx";
import { AuthorizeSitePage } from "../lib/AuthorizeSitePage.ts";
import { buildAuthorizeSiteShellData } from "../lib/page-data.ts";

@Route("/account")
@RenderMode("csr")
@Authorize()
export class AccountPage extends AuthorizeSitePage {
  override async load(context: PageLoadContext) {
    return await buildAuthorizeSiteShellData({
      principal: context.principal,
      url: context.url,
    });
  }

  override head() {
    return {
      title: "Account",
    };
  }

  override render(): HTMLElement {
    const shell = this.props.data;

    return (
      <AuthorizeSiteFrame
        shell={shell}
        eyebrow="Plain @Authorize()"
        title="Authenticated routes stay simple"
        lead="This page only requires an authenticated principal. Everything else is just route-owned data and render logic."
      >
        <section className="authorize-site-card-grid">
          <article className="authorize-site-card">
            <h2>Resolved principal</h2>
            <div className="authorize-site-kv">
              <div className="authorize-site-kv-row">
                <span className="authorize-site-kv-label">User</span>
                <span className="authorize-site-code">
                  {shell?.principalLabel ?? "Unknown"}
                </span>
              </div>
              <div className="authorize-site-kv-row">
                <span className="authorize-site-kv-label">Roles</span>
                <span className="authorize-site-code">
                  {shell?.roles.length ? shell.roles.join(", ") : "none"}
                </span>
              </div>
              <div className="authorize-site-kv-row">
                <span className="authorize-site-kv-label">Org claim</span>
                <span className="authorize-site-code">
                  {shell?.orgId ?? "none"}
                </span>
              </div>
            </div>
          </article>

          <article className="authorize-site-card">
            <h2>Navigation behavior</h2>
            <p>
              The nav above is filtered through
              <span className="authorize-site-code">
                filterVisibleRoutes()
              </span>. Authenticated users see more routes, but only when the
              matching role or policy passes.
            </p>
          </article>
        </section>

        <section className="authorize-site-panel authorize-site-owner-shell">
          <h2>Privileged component inside a broader authenticated page</h2>
          <p>
            The wrapper text is public to any authenticated user. The component
            below owns a stricter rule and renders only when the principal
            carries the
            <span className="authorize-site-code">owner</span> role.
          </p>
          <OwnerTools />
        </section>
      </AuthorizeSiteFrame>
    );
  }
}
