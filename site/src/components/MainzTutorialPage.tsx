import { Component, CustomElement } from "mainz";
import { t } from "../i18n/index.ts";
import { highlightTypeScriptCodeBlocks } from "../lib/highlight.ts";
import { pageStyles } from "../styles/pageStyles.ts";
import { CheckpointQuiz } from "./CheckpointQuiz.tsx";
import { ConceptCard } from "./ConceptCard.tsx";
import { HeroIntro } from "./HeroIntro.tsx";
import { InteractiveSandbox } from "./InteractiveSandbox.tsx";
import { LanguageSwitcher } from "./LanguageSwitcher.tsx";
import type { ConceptCardData, NextStepCardData, StageData } from "./types.ts";

interface TutorialState {
    currentStage: number;
}

@CustomElement("x-mainz-tutorial-page")
export class MainzTutorialPage extends Component<{}, TutorialState> {
    static override styles = pageStyles;

    protected override initState(): TutorialState {
        return {
            currentStage: 0,
        };
    }

    override onMount(): void {
        this.registerDOMEvent(window, "load", this.handleWindowLoad);
        this.handleWindowLoad();
    }

    override afterRender(): void {
        highlightTypeScriptCodeBlocks(this);
    }

    private goToStage = (index: number) => {
        this.setState({ currentStage: index });
    };

    private handleWindowLoad = () => {
        highlightTypeScriptCodeBlocks(this);
    };

    override render(): HTMLElement {
        const stages = t<StageData[]>("journey.stages");
        const journeySnippets = t<string[]>("journey.snippets");
        const concepts = t<ConceptCardData[]>("concepts.cards");
        const nextStepCards = t<NextStepCardData[]>("nextSteps.cards");
        const anchors = t<Record<string, string>>("anchors");
        const progress = Math.round(
            ((this.state.currentStage + 1) / stages.length) * 100,
        );
        const currentJourneySnippet = journeySnippets[this.state.currentStage] ??
            journeySnippets[0] ?? "";

        return (
            <div id={anchors.top} className="page-shell">
                <header className="top-nav panel">
                    <a className="brand" href={`#${anchors.top}`}>{t("nav.brand")}</a>
                    <div className="top-nav-actions">
                        <nav className="top-links" aria-label={t("nav.ariaLabel")}>
                            <a href={`#${anchors.hero}`}>{t("nav.home")}</a>
                            <a href={`#${anchors.journey}`}>{t("nav.journey")}</a>
                            <a href={`#${anchors.concepts}`}>{t("nav.concepts")}</a>
                            <a href={`#${anchors.checkpoint}`}>{t("nav.checkpoint")}</a>
                            <a href={`#${anchors.sandbox}`}>{t("nav.workshop")}</a>
                        </nav>
                        <LanguageSwitcher />
                    </div>
                </header>

                <HeroIntro />

                <section id={anchors.journey} className="panel">
                    <div className="chapter-header">
                        <div>
                            <p className="eyebrow">{t("journey.eyebrow")}</p>
                            <h2 className="chapter-title">{t("journey.title")}</h2>
                        </div>
                        <span className="progress-chip">
                            {progress}% {t("journey.progressSuffix")}
                        </span>
                    </div>

                    <div className="chapter-row">
                        {stages.map((stage, index) => (
                            <button
                                key={stage.label}
                                type="button"
                                className={`chapter-button ${
                                    this.state.currentStage === index ? "active" : ""
                                }`}
                                onClick={() => this.goToStage(index)}
                            >
                                {index + 1}. {stage.label}
                            </button>
                        ))}
                    </div>

                    <p className="chapter-description">
                        {stages[this.state.currentStage].description}
                    </p>
                    <div className="journey-code">
                        <p className="eyebrow">{t("journey.codeTitle")}</p>
                        <pre>
                            <code className="language-typescript" data-raw-code={currentJourneySnippet}>
                                {currentJourneySnippet}
                            </code>
                        </pre>
                    </div>
                    <a className="back-link" href={`#${anchors.top}`}>
                        {t("common.backToTop")}
                    </a>
                </section>

                <section id={anchors.concepts} className="panel concept-section">
                    <div className="section-head">
                        <p className="eyebrow">{t("concepts.eyebrow")}</p>
                        <h2>{t("concepts.title")}</h2>
                    </div>

                    <div className="concept-grid">
                        {concepts.map((item) => (
                            <ConceptCard
                                key={item.title}
                                title={item.title}
                                description={item.description}
                                tag={item.tag}
                            />
                        ))}
                    </div>

                    <a className="back-link" href={`#${anchors.top}`}>
                        {t("common.backToTop")}
                    </a>
                </section>

                <CheckpointQuiz />

                <InteractiveSandbox />

                <section id={anchors.nextSteps} className="panel next-steps">
                    <div className="section-head">
                        <p className="eyebrow">{t("nextSteps.eyebrow")}</p>
                        <h2>{t("nextSteps.title")}</h2>
                    </div>

                    <div className="next-grid">
                        {nextStepCards.map((card) => (
                            <article key={card.title} className="next-card">
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                            </article>
                        ))}
                    </div>

                    <a className="back-link" href={`#${anchors.top}`}>
                        {t("common.backToTop")}
                    </a>
                </section>

                <footer className="panel footer">
                    <p>{t("footer.note")}</p>
                    <a
                        className="source-link"
                        href="https://github.com/soguten/mainz"
                        target="_blank"
                        rel="noreferrer"
                    >
                        {t("footer.sourceLabel")}
                    </a>
                </footer>
            </div>
        );
    }
}
