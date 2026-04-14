import { type PageLoadContext, RenderMode, Route } from "mainz";
import { AuthorizeSiteFrame } from "../components/AuthorizeSiteFrame.tsx";
import { AuthorizeSitePage } from "../lib/AuthorizeSitePage.ts";
import { buildAuthorizeSiteShellData } from "../lib/page-data.ts";
import { activateSessionAndNavigate, listSessionPresets } from "../lib/session.ts";
import { Button, Card } from "mainz/typecase";

@Route("/login")
@RenderMode("csr")
export class LoginPage extends AuthorizeSitePage {
    override async load(context: PageLoadContext) {
        return await buildAuthorizeSiteShellData({
            principal: context.principal,
            url: context.url,
        });
    }

    override head() {
        return {
            title: "Choose Session",
        };
    }

    override render(): HTMLElement {
        const shell = this.props.data;

        return (
            <AuthorizeSiteFrame
                shell={shell}
                eyebrow="Login flow"
                title="Swap principals without a backend"
                lead="The example stores a tiny session record in localStorage, then resolves a Mainz Principal through auth.getPrincipal on every navigation."
            >
                <section className="authorize-site-note">
                    Anonymous visitors who type a protected route are redirected here through
                    <span className="authorize-site-code">auth.loginPath</span>. Authenticated users
                    keep the same login page available so you can switch personas quickly.
                </section>

                <section className="authorize-site-login-grid">
                    {listSessionPresets().map((preset) => (
                        <Card key={preset.id} className="authorize-site-login-card">
                            <div>
                                <Card.Title>{preset.label}</Card.Title>
                                <p>{preset.description}</p>
                            </div>
                            <span className="authorize-site-login-route">
                                Default route: {preset.defaultPath}
                            </span>
                            <Button
                                onClick={() =>
                                    activateSessionAndNavigate(preset.id)}
                            >
                                Continue as {preset.label}
                            </Button>
                        </Card>
                    ))}
                </section>
            </AuthorizeSiteFrame>
        );
    }
}
