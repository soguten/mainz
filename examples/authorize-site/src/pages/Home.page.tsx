import { type PageLoadContext, RenderMode, Route } from "mainz";
import { AuthorizeSiteFrame } from "../components/AuthorizeSiteFrame.tsx";
import { AuthorizeSitePage } from "../lib/AuthorizeSitePage.ts";
import { buildAuthorizeSiteShellData } from "../lib/page-data.ts";
import { listSessionPresets } from "../lib/session.ts";
import { Card } from "mainz/typecase";

@Route("/")
@RenderMode("csr")
export class HomePage extends AuthorizeSitePage {
  override async load(context: PageLoadContext) {
    return await buildAuthorizeSiteShellData({
      principal: context.principal,
      url: context.url,
    });
  }

  override head() {
    return {
      title: "Authorization Example",
    };
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
          <Card className="authorize-site-card" variant="subtle">
            <Card.Title>What to try</Card.Title>
            <p>
              Visit{" "}
              <span className="authorize-site-code">/login</span>, choose a
              persona, and watch the navigation change as the resolved principal
              changes.
            </p>
          </Card>

          <Card className="authorize-site-card" variant="subtle">
            <Card.Title>Protected pages</Card.Title>
            <p>
              <span className="authorize-site-code">/account</span>{" "}
              uses plain authentication,{" "}
              <span className="authorize-site-code">/billing</span>
              uses the named{" "}
              <span className="authorize-site-code">org-member</span>
              policy, and <span className="authorize-site-code">/reports</span>
              {" "}
              uses the{" "}
              <span className="authorize-site-code">billing-admin</span> role.
            </p>
          </Card>

          <Card className="authorize-site-card" variant="subtle">
            <Card.Title>Protected component</Card.Title>
            <p>
              The account page always renders for authenticated users, but an
              owner-only component appears only when the current principal
              carries the
              <span className="authorize-site-code">owner</span> role.
            </p>
          </Card>
        </section>

        <Card className="authorize-site-panel">
          <Card.Title>Suggested personas</Card.Title>
          <div className="authorize-site-card-grid">
            {listSessionPresets().map((preset) => (
              <Card
                key={preset.id}
                className="authorize-site-card"
                variant="subtle"
              >
                <Card.Title>{preset.label}</Card.Title>
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
              </Card>
            ))}
          </div>
        </Card>
      </AuthorizeSiteFrame>
    );
  }
}
