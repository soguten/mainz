import { Component, CustomElement } from "mainz";
import { t } from "../i18n/index.ts";

interface CheckpointItem {
    question: string;
    options: string[];
    correctIndex: number;
    success: string;
    failure: string;
}

interface CheckpointState {
    currentIndex: number;
    selectedIndex: number | null;
    checked: boolean;
    answers: number[];
}

@CustomElement("x-checkpoint-quiz")
export class CheckpointQuiz extends Component<{}, CheckpointState> {
    protected override initState(): CheckpointState {
        return {
            currentIndex: 0,
            selectedIndex: null,
            checked: false,
            answers: [],
        };
    }

    private selectOption = (index: number) => {
        this.setState({
            selectedIndex: index,
            checked: false,
        });
    };

    private checkAnswer = () => {
        if (this.state.selectedIndex == null) return;

        const nextAnswers = [...this.state.answers];
        nextAnswers[this.state.currentIndex] = this.state.selectedIndex;

        this.setState({
            checked: true,
            answers: nextAnswers,
        });
    };

    private goToNextQuestion = () => {
        const items = t<CheckpointItem[]>("checkpoint.items");
        const isLast = this.state.currentIndex >= items.length - 1;

        if (isLast) return;

        this.setState({
            currentIndex: this.state.currentIndex + 1,
            selectedIndex: this.state.answers[this.state.currentIndex + 1] ?? null,
            checked: false,
        });
    };

    private restartCheckpoint = () => {
        this.setState({
            currentIndex: 0,
            selectedIndex: null,
            checked: false,
            answers: [],
        });
    };

    override render(): HTMLElement {
        const items = t<CheckpointItem[]>("checkpoint.items");
        const currentItem = items[this.state.currentIndex];
        const isLast = this.state.currentIndex >= items.length - 1;
        const selectedIndex = this.state.selectedIndex;
        const isCorrect = selectedIndex != null &&
            selectedIndex === currentItem.correctIndex;
        const hasResult = this.state.checked;
        const canSubmit = selectedIndex != null && !this.state.checked;

        const answeredCount = this.state.answers.filter((entry) => entry !== undefined).length;
        const allAnswered = answeredCount === items.length;
        const correctCount = this.state.answers.reduce((count, answer, index) => {
            if (answer === items[index]?.correctIndex) return count + 1;
            return count;
        }, 0);

        return (
            <section id={t("anchors.checkpoint")} className="panel checkpoint">
                <div className="section-head">
                    <p className="eyebrow">
                        {t("checkpoint.eyebrow")}
                    </p>
                    <h2>{t("checkpoint.title")}</h2>
                    <p>
                        {t("checkpoint.description")}
                    </p>
                </div>

                <p className="progress-chip">
                    {t("checkpoint.progressLabel")} {this.state.currentIndex + 1}/{items.length}
                </p>

                <p className="checkpoint-question">{currentItem.question}</p>

                <div className="checkpoint-options">
                    {currentItem.options.map((option, index) => (
                        <button
                            key={`${this.state.currentIndex}-${option}`}
                            type="button"
                            className={`checkpoint-option ${
                                selectedIndex === index ? "active" : ""
                            }`}
                            onClick={() => this.selectOption(index)}
                        >
                            {option}
                        </button>
                    ))}
                </div>

                <div className="checkpoint-actions">
                    <button
                        type="button"
                        className="button button-primary"
                        disabled={canSubmit ? null : true}
                        onClick={this.checkAnswer}
                    >
                        {t("checkpoint.submit")}
                    </button>

                    {hasResult && !isLast && (
                        <button
                            type="button"
                            className="button button-ghost"
                            onClick={this.goToNextQuestion}
                        >
                            {t("checkpoint.next")}
                        </button>
                    )}

                    {hasResult && isLast && (
                        <button
                            type="button"
                            className="button button-ghost"
                            onClick={this.restartCheckpoint}
                        >
                            {t("checkpoint.retry")}
                        </button>
                    )}
                </div>

                {hasResult && (
                    <p className={`checkpoint-result ${isCorrect ? "ok" : "fail"}`}>
                        {isCorrect ? currentItem.success : currentItem.failure}
                    </p>
                )}

                {allAnswered && isLast && (
                    <p className="checkpoint-score">
                        {t("checkpoint.finish")}: {correctCount}/{items.length}
                    </p>
                )}

                <a className="back-link" href={`#${t("anchors.top")}`}>
                    {t("common.backToTop")}
                </a>
            </section>
        );
    }
}
