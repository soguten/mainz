import { Component, CustomElement } from "mainz";

type HydrationTestComponentProps = {
    locale: "en" | "pt";
};

type HydrationTestComponentState = {
    activeChapter: "intro" | "deep-dive";
};

@CustomElement("x-mainz-root-app-hydration-test-component")
export class HydrationTestComponent
    extends Component<HydrationTestComponentProps, HydrationTestComponentState> {
    override initState(): HydrationTestComponentState {
        return { activeChapter: "intro" };
    }

    override render() {
        const isPortuguese = this.props.locale === "pt";
        const activeChapter = this.state.activeChapter;

        return (
            <section>
                <h1>{isPortuguese ? "Iniciar trilha guiada" : "Start guided journey"}</h1>
                <p>{isPortuguese ? "Trilha guiada" : "Guided journey"}</p>

                <div className="chapter-row">
                    <button
                        className={`chapter-button${activeChapter === "intro" ? " active" : ""}`}
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
