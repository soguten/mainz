import { Component, CustomElement } from "mainz";
import { t } from "../i18n/index.ts";

@CustomElement("x-hero-intro")
export class HeroIntro extends Component {
  override render(): HTMLElement {
    return (
      <section id={t("anchors.hero")} className="hero panel">
        <p className="eyebrow">
          {t("hero.eyebrow")}
        </p>
        <h1>{t("hero.title")}</h1>
        <p className="lead">
          {t("hero.lead")}
        </p>
        <div className="hero-cta-row">
          <a
            className="button button-primary"
            href={`#${t("anchors.journey")}`}
          >
            {t("hero.tutorialCta")}
          </a>
          <a className="button button-ghost" href={`#${t("anchors.sandbox")}`}>
            {t("hero.workshopCta")}
          </a>
        </div>
      </section>
    );
  }
}
