import { Component, customElement } from "mainz";
import { buildSiteLocaleHref, getLocale, type SiteLocale, siteLocales, t } from "../i18n/index.ts";

@customElement("x-language-switcher")
export class LanguageSwitcher extends Component {
    override render(): HTMLElement {
        const currentLocale = getLocale();

        return (
            <div className="locale-switcher" aria-label={t("nav.languageMenuLabel")}>
                <span className="locale-switcher-label">{t("nav.languageLabel")}</span>
                <div className="locale-switcher-list">
                    {siteLocales.map((locale) => (
                        <a
                            key={locale}
                            className={`locale-chip ${locale === currentLocale ? "active" : ""}`}
                            href={buildSiteLocaleHref(locale)}
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

function getLocaleChipLabel(locale: SiteLocale): string {
    return locale.toUpperCase();
}
