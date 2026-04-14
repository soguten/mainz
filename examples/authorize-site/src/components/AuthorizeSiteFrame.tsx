import type { AuthorizeSiteShellData } from "../lib/page-data.ts";
import { signOutAndNavigate } from "../lib/session.ts";
import { Button, Card, CodeBlock, Text, TypecaseRoot } from "mainz/typecase";

interface AuthorizeSiteFrameProps {
    shell?: AuthorizeSiteShellData;
    eyebrow: string;
    title: string;
    lead: string;
    children?: unknown;
}

export function AuthorizeSiteFrame(props: AuthorizeSiteFrameProps) {
    const shell = props.shell;

    return (
        <TypecaseRoot className="authorize-site-app">
            <div className="authorize-site-shell">
                <header className="authorize-site-header">
                    <div className="authorize-site-topline">
                        <a className="authorize-site-brand" href="/">
                            <span className="authorize-site-brand-mark"></span>
                            Mainz authorization example
                        </a>

                        <div className="authorize-site-status">
                            <div className="authorize-site-status-copy">
                                <span className="authorize-site-status-label">
                                    {shell?.principalLabel ?? "Anonymous visitor"}
                                </span>
                                <span className="authorize-site-status-summary">
                                    {shell?.principalSummary ??
                                        "Only public routes stay visible until a session is chosen."}
                                </span>
                            </div>

                            {shell?.authenticated
                                ? (
                                    <>
                                        <a className="authorize-site-link-chip" href="/login">
                                            Switch session
                                        </a>
                                        <Button
                                            className="authorize-site-button"
                                            onClick={() => signOutAndNavigate("/")}
                                            size="sm"
                                            variant="secondary"
                                        >
                                            Sign out
                                        </Button>
                                    </>
                                )
                                : (
                                    <a
                                        className="authorize-site-link-chip authorize-site-button-primary"
                                        href="/login"
                                    >
                                        Choose session
                                    </a>
                                )}
                        </div>
                    </div>

                    <div className="authorize-site-hero">
                        <Text
                            as="p"
                            className="authorize-site-eyebrow"
                            tone="muted"
                            weight="semibold"
                        >
                            {props.eyebrow}
                        </Text>
                        <h1 className="authorize-site-title">{props.title}</h1>
                        <p className="authorize-site-lead">{props.lead}</p>
                    </div>

                    <div className="authorize-site-meta">
                        <span className="authorize-site-pill">
                            Visible routes: {shell?.navigation.length ?? 0}
                        </span>
                        <span className="authorize-site-pill authorize-site-pill-muted">
                            Roles: {shell?.roles.length ? shell.roles.join(", ") : "none"}
                        </span>
                        <span className="authorize-site-pill authorize-site-pill-muted">
                            Org: {shell?.orgId ?? "public"}
                        </span>
                    </div>

                    <nav className="authorize-site-nav" aria-label="Visible routes">
                        {shell?.navigation.map((item) => (
                            <a
                                key={item.id}
                                className="authorize-site-nav-link"
                                data-active={item.active ? "true" : "false"}
                                href={item.path}
                            >
                                <span className="authorize-site-nav-title">{item.label}</span>
                                <span className="authorize-site-nav-summary">{item.summary}</span>
                                <span className="authorize-site-nav-access">{item.access}</span>
                            </a>
                        ))}
                    </nav>

                    <section className="authorize-site-runtime-panel">
                        <Card className="authorize-site-runtime-card" variant="subtle">
                            <Card.Header className="authorize-site-runtime-heading">
                                <Text
                                    as="p"
                                    className="authorize-site-eyebrow"
                                    tone="muted"
                                    weight="semibold"
                                >
                                    Resolved Principal
                                </Text>
                                <Card.Title>Runtime object used by Mainz</Card.Title>
                            </Card.Header>
                            <p>
                                This is the actual `Principal` shape after `auth.getPrincipal()`
                                resolves. It is what page checks, policy checks, and component
                                checks consume.
                            </p>
                            <CodeBlock className="authorize-site-json-block">
                                <CodeBlock.Header>
                                    <CodeBlock.Language>json</CodeBlock.Language>
                                </CodeBlock.Header>
                                <CodeBlock.Body>
                                    {shell?.resolvedPrincipalJson ?? `{
  "authenticated": false,
  "roles": [],
  "claims": {}
}`}
                                </CodeBlock.Body>
                            </CodeBlock>
                        </Card>

                        <Card className="authorize-site-runtime-card" variant="subtle">
                            <Card.Header className="authorize-site-runtime-heading">
                                <Text
                                    as="p"
                                    className="authorize-site-eyebrow"
                                    tone="muted"
                                    weight="semibold"
                                >
                                    Access Matrix
                                </Text>
                                <Card.Title>Why checks pass or fail</Card.Title>
                            </Card.Header>
                            <div className="authorize-site-check-list">
                                {shell?.accessChecks.map((check) => (
                                    <div key={check.label} className="authorize-site-check-row">
                                        <div className="authorize-site-check-copy">
                                            <span className="authorize-site-check-label">
                                                {check.label}
                                            </span>
                                            <span className="authorize-site-check-reason">
                                                {check.reason}
                                            </span>
                                        </div>
                                        <span
                                            className="authorize-site-check-badge"
                                            data-result={check.result}
                                        >
                                            {check.result}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </section>
                </header>

                <main className="authorize-site-body">{props.children}</main>
            </div>
        </TypecaseRoot>
    );
}
