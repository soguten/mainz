import { Component } from "../../../components/index.ts";
import { Button } from "../../primitives/index.ts";
import { DropdownMenu } from "../DropdownMenu/index.ts";
import { CaretDownFillIcon } from "../../icons/CaretDownFill.tsx";
import { CheckIcon, CircleHalfIcon, MoonIcon, SunIcon } from "../../icons/index.ts";
import {
    TYPECASE_THEME_CHANGE_EVENT,
    TYPECASE_THEME_PREFERENCE_REQUEST_EVENT,
    type TypecaseThemeChangeDetail,
} from "../../theme-runtime.ts";
import type { TypecaseThemePreference } from "../../themes/types.ts";
import { joinClassNames } from "../../utils/class-name.ts";

interface ThemeSwitchState {
    availableSchemes: Array<"light" | "dark">;
    preference: TypecaseThemePreference;
    resolvedScheme: "light" | "dark";
}

export interface ThemeSwitchProps {
    className?: string;
    style?: string;
    title?: string;
    [key: string]: unknown;
}

export class ThemeSwitch extends Component<ThemeSwitchProps, ThemeSwitchState> {
    protected override initState(): ThemeSwitchState {
        return {
            availableSchemes: ["light"],
            preference: "light",
            resolvedScheme: "light",
        };
    }

    override onMount(): void {
        this.syncWithRoot();
    }

    override afterRender(): void {
        this.syncWithRoot();
    }

    private getRootElement(): HTMLElement | null {
        return this.closest(".typecase-root");
    }

    private syncWithRoot(): void {
        const rootElement = this.getRootElement();

        if (!rootElement) {
            return;
        }

        this.registerDOMEvent(
            rootElement,
            TYPECASE_THEME_CHANGE_EVENT,
            this.handleThemeChange as EventListener,
        );

        const available = rootElement.getAttribute("data-typecase-theme-available") ?? "light";
        const preference = rootElement.getAttribute("data-typecase-theme-preference");
        const resolvedScheme = rootElement.getAttribute("data-typecase-theme-scheme");
        const availableSchemes = available
            .split(",")
            .filter((value): value is "light" | "dark" => value === "light" || value === "dark");
        const nextState: ThemeSwitchState = {
            availableSchemes: availableSchemes.length > 0 ? availableSchemes : ["light"],
            preference: preference === "dark" || preference === "auto" ? preference : "light",
            resolvedScheme: resolvedScheme === "dark" ? "dark" : "light",
        };

        if (
            nextState.preference === this.state.preference &&
            nextState.resolvedScheme === this.state.resolvedScheme &&
            nextState.availableSchemes.join(",") === this.state.availableSchemes.join(",")
        ) {
            return;
        }

        this.setState(nextState);
    }

    private handleThemeChange = (event: Event): void => {
        const customEvent = event as CustomEvent<TypecaseThemeChangeDetail>;
        const detail = customEvent.detail;

        this.setState({
            availableSchemes: [...detail.availableSchemes],
            preference: detail.preference,
            resolvedScheme: detail.resolvedScheme,
        });
    };

    private selectPreference = (preference: TypecaseThemePreference): void => {
        const rootElement = this.getRootElement();

        if (!rootElement) {
            return;
        }

        rootElement.dispatchEvent(
            new CustomEvent(TYPECASE_THEME_PREFERENCE_REQUEST_EVENT, {
                bubbles: true,
                detail: {
                    preference,
                },
            }),
        );
    };

    private renderPreferenceIcon(preference: TypecaseThemePreference) {
        if (preference === "dark") {
            return <MoonIcon aria-hidden="true" size={16} />;
        }

        if (preference === "auto") {
            return <CircleHalfIcon aria-hidden="true" size={16} />;
        }

        return <SunIcon aria-hidden="true" size={16} />;
    }

    private renderCurrentIcon() {
        return this.renderPreferenceIcon(
            this.state.preference === "auto" ? this.state.resolvedScheme : this.state.preference,
        );
    }

    private handleMenuSelect = (value: string): void => {
        if (value === "light" || value === "dark" || value === "auto") {
            this.selectPreference(value);
        }
    };

    private renderOption(label: string, preference: TypecaseThemePreference) {
        const active = this.state.preference === preference;

        return (
            <DropdownMenu.Item
                active={active}
                trailing={active ? <CheckIcon aria-hidden="true" size={16} /> : null}
                value={preference}
            >
                {this.renderPreferenceIcon(preference)}
                {label}
            </DropdownMenu.Item>
        );
    }

    override render(): HTMLElement | DocumentFragment {
        const { className, style, title = "Theme", ...rest } = this.props;
        const showAuto = this.state.availableSchemes.length > 1;

        return (
            <div
                {...rest}
                className={joinClassNames("tc-theme-switch", className)}
                style={style}
            >
                <DropdownMenu onSelect={this.handleMenuSelect}>
                    <DropdownMenu.Trigger>
                        <Button
                            aria-label={title}
                            className="tc-theme-switch-trigger"
                            size="sm"
                            variant="ghost"
                        >
                            <span className="tc-theme-switch-trigger-icon">
                                {this.renderCurrentIcon()}
                            </span>
                            <CaretDownFillIcon aria-hidden="true" size={14} />
                        </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content aria-label={title}>
                        {this.state.availableSchemes.includes("light")
                            ? this.renderOption("Light", "light")
                            : null}
                        {this.state.availableSchemes.includes("dark")
                            ? this.renderOption("Dark", "dark")
                            : null}
                        {showAuto ? this.renderOption("Auto", "auto") : null}
                    </DropdownMenu.Content>
                </DropdownMenu>
            </div>
        );
    }
}
