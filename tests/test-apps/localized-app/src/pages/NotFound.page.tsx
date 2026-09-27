import { CustomElement, Locales, Page, RenderMode } from "mainz";
import { t } from "mainz/i18n";

@CustomElement("x-mainz-localized-app-not-found-page")
@RenderMode("ssg")
@Locales("en", "pt")
export class LocalizedNotFoundPage extends Page {
  override metadata() {
    return {
      title: "404 | Mainz",
    };
  }

  override render() {
    const pathname = this.route.url?.pathname ?? "/";

    return (
      <section data-app-surface="localized-app-not-found">
        <p>{t("notFound.eyebrow")}</p>
        <h1>{t("notFound.title")}</h1>
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
