import { Component, CustomElement } from "mainz";
import { t } from "../i18n/index.ts";
import { highlightTypeScriptCodeBlocks } from "../lib/highlight.ts";

interface WorkshopChallenge {
    title: string;
    instruction: string;
    starter: string;
    success: string;
    hint: string;
}

interface WorkshopState {
    currentChallenge: number;
    drafts: string[];
    passed: boolean[];
    selectedValidated: boolean;
    feedback: string;
    feedbackMode: "ok" | "fail" | "idle";
}

@CustomElement("x-interactive-sandbox")
export class InteractiveSandbox extends Component<{}, WorkshopState> {
    protected override initState(): WorkshopState {
        const challenges = t<WorkshopChallenge[]>("sandbox.challenges");

        return {
            currentChallenge: 0,
            drafts: challenges.map((challenge) => challenge.starter),
            passed: challenges.map(() => false),
            selectedValidated: false,
            feedback: "",
            feedbackMode: "idle",
        };
    }

    private updateDraft = (event: Event) => {
        const input = event.currentTarget as HTMLTextAreaElement;
        const nextDrafts = [...this.state.drafts];
        nextDrafts[this.state.currentChallenge] = input.value;

        this.setState({
            drafts: nextDrafts,
            feedbackMode: "idle",
            feedback: "",
            selectedValidated: false,
        });
    };

    override afterRender(): void {
        highlightTypeScriptCodeBlocks(this);
        this.syncEditorViewport();
    }

    private validateCurrentChallenge = () => {
        const code = this.state.drafts[this.state.currentChallenge] ?? "";
        const challenges = t<WorkshopChallenge[]>("sandbox.challenges");
        const challenge = challenges[this.state.currentChallenge];
        const isValid = validators[this.state.currentChallenge]?.(code) ?? false;

        if (!isValid) {
            this.setState({
                feedbackMode: "fail",
                feedback: `${t("sandbox.failPrefix")}: ${challenge.hint}`,
                selectedValidated: false,
            });
            return;
        }

        const nextPassed = [...this.state.passed];
        nextPassed[this.state.currentChallenge] = true;

        this.setState({
            passed: nextPassed,
            feedbackMode: "ok",
            feedback: `${t("sandbox.successPrefix")}: ${challenge.success}`,
            selectedValidated: true,
        });
    };

    private moveToNextChallenge = () => {
        const nextIndex = this.state.currentChallenge + 1;
        const challenges = t<WorkshopChallenge[]>("sandbox.challenges");
        if (nextIndex >= challenges.length) return;

        this.setState({
            currentChallenge: nextIndex,
            feedbackMode: "idle",
            feedback: "",
            selectedValidated: false,
        });
    };

    private restartWorkshop = () => {
        const challenges = t<WorkshopChallenge[]>("sandbox.challenges");
        this.setState({
            currentChallenge: 0,
            drafts: challenges.map((challenge) => challenge.starter),
            passed: challenges.map(() => false),
            selectedValidated: false,
            feedback: "",
            feedbackMode: "idle",
        });
    };

    private insertTabAtCursor(textarea: HTMLTextAreaElement) {
        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        const value = textarea.value;
        const indent = "    ";

        const nextValue = value.slice(0, start) +
            indent +
            value.slice(end);

        const nextDrafts = [...this.state.drafts];
        nextDrafts[this.state.currentChallenge] = nextValue;

        this.setState({
            drafts: nextDrafts,
            feedbackMode: "idle",
            feedback: "",
            selectedValidated: false,
        });

        queueMicrotask(() => {
            textarea.selectionStart = start + indent.length;
            textarea.selectionEnd = start + indent.length;
        });
    }

    private handleEditorKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;

        event.preventDefault();
        this.insertTabAtCursor(event.currentTarget as HTMLTextAreaElement);
    };

    private handleEditorScroll = () => {
        this.syncEditorViewport();
    };

    private syncEditorViewport() {
        const textarea = this.querySelector<HTMLTextAreaElement>(
            "#workshop-editor",
        );
        const preview = this.querySelector<HTMLElement>(".sandbox-editor-preview");
        const gutter = this.querySelector<HTMLElement>(".sandbox-editor-gutter");

        if (!textarea || !preview || !gutter) {
            return;
        }

        preview.scrollTop = textarea.scrollTop;
        preview.scrollLeft = textarea.scrollLeft;
        gutter.scrollTop = textarea.scrollTop;
    }

    override render(): HTMLElement {
        const anchors = t<Record<string, string>>("anchors");
        const challenges = t<WorkshopChallenge[]>("sandbox.challenges");
        const challenge = challenges[this.state.currentChallenge];
        const currentDraft = this.state.drafts[this.state.currentChallenge] ?? "";
        const lineCount = Math.max(currentDraft.split("\n").length, 1);
        const total = challenges.length;
        const challengeNumber = this.state.currentChallenge + 1;
        const finalUnlocked = this.state.passed.every(Boolean);
        const isLast = this.state.currentChallenge === total - 1;

        return (
            <section id={anchors.sandbox} className="panel sandbox">
                <div className="section-head">
                    <p className="eyebrow">{t("sandbox.eyebrow")}</p>
                    <h2>{t("sandbox.title")}</h2>
                    <p>{t("sandbox.description")}</p>
                </div>

                <p className="progress-chip">
                    {t("sandbox.challengeLabel")} {challengeNumber}/{total}
                </p>

                <article className="sandbox-card">
                    <h3>{challenge.title}</h3>
                    <p>{challenge.instruction}</p>

                    <label className="sandbox-editor-label" htmlFor="workshop-editor">
                        {t("sandbox.editorLabel")}
                    </label>
                    <div className="sandbox-editor-shell">
                        <div className="sandbox-editor-gutter" aria-hidden="true">
                            {Array.from(
                                { length: lineCount },
                                (_, index) => (
                                    <span
                                        key={`line-${challengeNumber}-${index + 1}`}
                                        className="sandbox-editor-line"
                                    >
                                        {index + 1}
                                    </span>
                                ),
                            )}
                        </div>
                        <div className="sandbox-editor-stack">
                            <pre className="sandbox-editor-preview" aria-hidden="true">
                                <code className="language-typescript" data-raw-code={currentDraft}>
                                    {currentDraft || " "}
                                </code>
                            </pre>
                            <textarea
                                id="workshop-editor"
                                className="sandbox-editor"
                                value={currentDraft}
                                spellCheck={false}
                                autoComplete="off"
                                wrap="off"
                                onInput={this.updateDraft}
                                onKeyDown={this.handleEditorKeyDown}
                                onScroll={this.handleEditorScroll}
                            />
                        </div>
                    </div>

                    <div className="sandbox-actions">
                        <button
                            type="button"
                            className="button button-primary"
                            onClick={this.validateCurrentChallenge}
                        >
                            {t("sandbox.validate")}
                        </button>

                        {this.state.selectedValidated && !isLast && (
                            <button
                                type="button"
                                className="button button-ghost"
                                onClick={this.moveToNextChallenge}
                            >
                                {t("sandbox.next")}
                            </button>
                        )}

                        {finalUnlocked && (
                            <button
                                type="button"
                                className="button button-ghost"
                                onClick={this.restartWorkshop}
                            >
                                {t("sandbox.restart")}
                            </button>
                        )}
                    </div>

                    {this.state.feedbackMode !== "idle" && (
                        <p
                            className={`checkpoint-result ${
                                this.state.feedbackMode === "ok" ? "ok" : "fail"
                            }`}
                        >
                            {this.state.feedback}
                        </p>
                    )}
                </article>

                {finalUnlocked && (
                    <article className="sandbox-card">
                        <h3>{t("sandbox.finalTitle")}</h3>
                        <p>
                            {t("sandbox.finalDescription")}
                        </p>
                        <pre onKeyDown={this.restartWorkshop}>
                            <code className="language-typescript" data-raw-code={t("sandbox.finalCode")}>
                                {t("sandbox.finalCode")}
                            </code>
                        </pre>
                    </article>
                )}

                <a className="back-link" href={`#${anchors.top}`}>
                    {t("common.backToTop")}
                </a>
            </section>
        );
    }
}

const validators = [
    (code: string) =>
        /import\s*\{\s*Component\s*\}\s*from\s*["']mainz["']/.test(code) &&
        /class\s+Todo\s+extends\s+Component(?:<[^>]+>)?/.test(code),
    (code: string) =>
        /class\s+Todo\s+extends\s+Component(?:<[^>]+>)?/.test(code) &&
        /initState\s*\(/.test(code) &&
        /draft\s*:/.test(code) &&
        /items\s*:\s*\[\s*\]/.test(code),
    (code: string) =>
        /class\s+Todo\s+extends\s+Component(?:<[^>]+>)?/.test(code) &&
        /handleDraftInput\s*(=\s*\(.*\)\s*=>|\(.*\)\s*\{)/.test(code) &&
        /addTodo\s*(=\s*\(.*\)\s*=>|\(.*\)\s*\{)/.test(code) &&
        /setState\s*\(/.test(code) &&
        /onInput=\{this\.handleDraftInput\}/.test(code) &&
        /onClick=\{this\.addTodo\}/.test(code) &&
        /this\.state\.items\.map\s*\(/.test(code),
];
