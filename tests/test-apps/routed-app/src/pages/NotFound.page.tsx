import { CustomElement, Locales, Page, RenderMode } from "mainz";

@CustomElement("x-mainz-routed-app-not-found-page")
@RenderMode("ssg")
@Locales("en", "pt")
export class RoutedAppNotFoundPage extends Page {
  override head() {
    return {
      title: "404 | Mainz",
    };
  }

  override render() {
    const locale = this.route.locale ?? "en";
    const pathname = this.route.url?.pathname ?? "/";
    const isPortuguese = locale === "pt";

    return (
      <section data-app-surface="routed-app-not-found">
        <p>{isPortuguese ? "Atlas de rotas" : "Route atlas"}</p>
        <h1>
          {isPortuguese
            ? "Essa rota nao existe no Mainz."
            : "That route does not exist in Mainz."}
        </h1>
        <nav>
          <a data-locale="en" href={buildAlternateHref(pathname, "en")}>
            English
          </a>
          <a data-locale="pt" href={buildAlternateHref(pathname, "pt")}>
            Portugues
          </a>
        </nav>
      </section>
    );
  }
}

function buildAlternateHref(
  pathname: string,
  targetLocale: "en" | "pt",
): string {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment === "pt") {
    const [, ...rest] = segments;
    return targetLocale === "pt"
      ? `/${segments.join("/")}`
      : `/${rest.join("/")}`;
  }

  if (targetLocale === "pt") {
    return `/${targetLocale}/${segments.join("/")}/`;
  }

  return pathname;
}
