import { Component, CustomElement, NoProps } from "mainz";
import { t } from "mainz/i18n";

type JourneyGuidePanelState = {
  activeChapter: "intro" | "deep-dive";
};

@CustomElement("x-mainz-localized-app-journey-guide-panel")
export class JourneyGuidePanel extends Component<NoProps, JourneyGuidePanelState> {
  override initState(): JourneyGuidePanelState {
    return { activeChapter: "intro" };
  }

  override render() {
    const activeChapter = this.state.activeChapter;

    return (
      <section>
        <h1>
          {t("journey.title")}
        </h1>
        <p>{t("journey.description")}</p>

        <nav>
          <a className="locale-chip" data-locale="en" href="/">English</a>
          <a className="locale-chip" data-locale="pt" href="/pt/">Portugues</a>
          <a className="route-link" href="/quickstart">
            {t("navigation.quickstart")}
          </a>
        </nav>

        <div className="chapter-row">
          <button
            className={`chapter-button${
              activeChapter === "intro" ? " active" : ""
            }`}
            onClick={() => this.setState({ activeChapter: "intro" })}
          >
            {t("journey.intro")}
          </button>
          <button
            className={`chapter-button${
              activeChapter === "deep-dive" ? " active" : ""
            }`}
            onClick={() => this.setState({ activeChapter: "deep-dive" })}
          >
            {t("journey.chapters")}
          </button>
        </div>
      </section>
    );
  }
}
