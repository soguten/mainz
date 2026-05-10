import { Component, CustomElement } from "mainz";

type JourneyGuidePanelProps = {
  locale: "en" | "pt";
};

type JourneyGuidePanelState = {
  activeChapter: "intro" | "deep-dive";
};

@CustomElement("x-mainz-routed-app-journey-guide-panel")
export class JourneyGuidePanel
  extends Component<JourneyGuidePanelProps, JourneyGuidePanelState> {
  override initState(): JourneyGuidePanelState {
    return { activeChapter: "intro" };
  }

  override render() {
    const isPortuguese = this.props.locale === "pt";
    const activeChapter = this.state.activeChapter;

    return (
      <section>
        <h1>
          {isPortuguese ? "Iniciar trilha guiada" : "Start guided journey"}
        </h1>
        <p>{isPortuguese ? "Trilha guiada" : "Guided journey"}</p>

        <nav>
          <a className="locale-chip" data-locale="en" href="/">English</a>
          <a className="locale-chip" data-locale="pt" href="/pt/">Portugues</a>
        </nav>

        <div className="chapter-row">
          <button
            className={`chapter-button${
              activeChapter === "intro" ? " active" : ""
            }`}
            onClick={() => this.setState({ activeChapter: "intro" })}
          >
            {isPortuguese ? "Introducao" : "Introduction"}
          </button>
          <button
            className={`chapter-button${
              activeChapter === "deep-dive" ? " active" : ""
            }`}
            onClick={() => this.setState({ activeChapter: "deep-dive" })}
          >
            {isPortuguese ? "Capitulos" : "Chapters"}
          </button>
        </div>
      </section>
    );
  }
}
