import { CustomElement, Page, Route } from "mainz";

type CoreContractsRouteProps = {
    route?: {
        locale?: string;
        url?: URL;
    };
};

@CustomElement("x-mainz-not-found-page")
@Route("/404")
export class CoreContractsNotFoundPage extends Page<CoreContractsRouteProps> {
    static override page = {
        mode: "ssg" as const,
        notFound: true,
        locales: ["en", "pt"],
        head: {
            title: "404 | Mainz",
        },
    };

    override render() {
        const locale = this.props.route?.locale ?? "en";
        const pathname = this.props.route?.url?.pathname ?? "/";
        const isPortuguese = locale === "pt";

        return (
            <section>
                <h1>
                    {isPortuguese
                        ? "Essa rota nao existe no Mainz."
                        : "That route does not exist in Mainz."}
                </h1>
                <nav>
                    <a data-locale="en" href={buildAlternateHref(pathname, "en")}>English</a>
                    <a data-locale="pt" href={buildAlternateHref(pathname, "pt")}>Portugues</a>
                </nav>
            </section>
        );
    }
}

function buildAlternateHref(pathname: string, targetLocale: "en" | "pt"): string {
    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0];

    if (firstSegment === "pt") {
        const [, ...rest] = segments;
        return targetLocale === "pt" ? `/${segments.join("/")}` : `/en/${rest.join("/")}`;
    }

    if (targetLocale === "pt") {
        return `/${targetLocale}/${segments.join("/")}/`;
    }

    return pathname;
}
