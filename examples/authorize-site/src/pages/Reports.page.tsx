import { Authorize, type PageLoadContext, RenderMode, Route } from "mainz";
import { AuthorizeSiteFrame } from "../components/AuthorizeSiteFrame.tsx";
import { AuthorizeSitePage } from "../lib/AuthorizeSitePage.ts";
import { buildAuthorizeSiteShellData } from "../lib/page-data.ts";

@Route("/reports")
@RenderMode("csr")
@Authorize({ roles: ["billing-admin"] })
export class ReportsPage extends AuthorizeSitePage {
  override async load(context: PageLoadContext) {
    return await buildAuthorizeSiteShellData({
      principal: context.principal,
      url: context.url,
    });
  }

  override head() {
    return {
      title: "Reports",
    };
  }

  override render(): HTMLElement {
    return (
      <AuthorizeSiteFrame
        shell={this.props.data}
        eyebrow='Role requirement: "billing-admin"'
        title="Role-based pages stay declarative"
        lead="This route uses @Authorize({ roles: [...] }) without any extra runtime glue on the page itself."
      >
        <section className="authorize-site-card-grid">
          <article className="authorize-site-card">
            <h2>Monthly recurring revenue</h2>
            <p>
              A billing-focused route is often a better fit for a role than for
              a global policy. Here the page only needs a single, explicit role
              requirement.
            </p>
          </article>

          <article className="authorize-site-card">
            <h2>Operational note</h2>
            <p>
              If the current principal loses the
              <span className="authorize-site-code">billing-admin</span>{" "}
              role, the route disappears from navigation immediately and runtime
              access is denied on direct navigation.
            </p>
          </article>
        </section>
      </AuthorizeSiteFrame>
    );
  }
}
