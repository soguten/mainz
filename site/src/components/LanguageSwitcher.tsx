import { Component, CustomElement } from "mainz";
import {
  buildLocaleHref,
  getAppI18n,
  getLocale,
  t,
} from "mainz/i18n";

@CustomElement("x-language-switcher")
export class LanguageSwitcher extends Component {
  override render(): HTMLElement {
    const currentLocale = getLocale();
    const locales = getAppI18n().locales;

    return (
      <div className="locale-switcher" aria-label={t("nav.languageMenuLabel")}>
        <span className="locale-switcher-label">{t("nav.languageLabel")}</span>
        <div className="locale-switcher-list">
          {locales.map((locale) => (
            <a
              key={locale}
              className={`locale-chip ${
                locale === currentLocale ? "active" : ""
              }`}
              href={buildLocaleHref(locale, { hashDictionaryPath: "anchors" })}
              hreflang={locale}
              lang={locale}
              aria-current={locale === currentLocale ? "true" : undefined}
              aria-label={t(`localeNames.${locale}`)}
              data-locale={locale}
            >
              {getLocaleChipLabel(locale)}
            </a>
          ))}
        </div>
      </div>
    );
  }
}

function getLocaleChipLabel(locale: string): string {
  return locale.toUpperCase();
}
