import { Component } from "../components/index.ts";
import { TYPECASE_BASE_STYLES } from "./base-styles.ts";
import { lightTheme } from "./themes/light.ts";
import type {
    TypecaseTheme,
    TypecaseThemePreference,
    TypecaseThemeScheme,
} from "./themes/types.ts";
import {
    TYPECASE_THEME_CHANGE_EVENT,
    TYPECASE_THEME_PREFERENCE_REQUEST_EVENT,
    type TypecaseThemeChangeDetail,
} from "./theme-runtime.ts";
import { joinClassNames } from "./utils/class-name.ts";
import { mergeStyleAttributes, toThemeStyleAttribute } from "./utils/theme-style.ts";

interface TypecaseRootState {
    preference: TypecaseThemePreference;
}

type TypecaseThemeRegistry = Partial<Record<TypecaseThemeScheme, TypecaseTheme>>;

export interface TypecaseRootProps {
    children?: unknown;
    className?: string;
    defaultPreference?: TypecaseThemePreference;
    onPreferenceChange?: (preference: TypecaseThemePreference) => void;
    onResolvedThemeChange?: (theme: TypecaseTheme, detail: TypecaseThemeChangeDetail) => void;
    preference?: TypecaseThemePreference;
    storageKey?: string | false;
    style?: string;
    theme?: TypecaseTheme;
    themes?: readonly TypecaseTheme[] | TypecaseThemeRegistry;
    [key: string]: unknown;
}

function normalizeThemes(
    themes: TypecaseRootProps["themes"],
    fallbackTheme: TypecaseTheme | undefined,
): TypecaseThemeRegistry {
    if (Array.isArray(themes)) {
        return themes.reduce<TypecaseThemeRegistry>((registry, theme) => {
            registry[theme.scheme as TypecaseThemeScheme] = theme;
            return registry;
        }, {});
    }

    if (themes && !Array.isArray(themes)) {
        const registryThemes = themes as TypecaseThemeRegistry;

        return {
            dark: registryThemes.dark,
            light: registryThemes.light,
        };
    }

    if (fallbackTheme) {
        return {
            [fallbackTheme.scheme]: fallbackTheme,
        };
    }

    return {
        light: lightTheme,
    };
}

function resolveSystemScheme(): TypecaseThemeScheme {
    if (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
        return "dark";
    }

    return "light";
}

function readStoredPreference(storageKey: string | false | undefined): TypecaseThemePreference | null {
    if (!storageKey || typeof localStorage === "undefined") {
        return null;
    }

    const stored = localStorage.getItem(storageKey);

    if (stored === "light" || stored === "dark" || stored === "auto") {
        return stored;
    }

    return null;
}

function writeStoredPreference(
    storageKey: string | false | undefined,
    preference: TypecaseThemePreference,
): void {
    if (!storageKey || typeof localStorage === "undefined") {
        return;
    }

    localStorage.setItem(storageKey, preference);
}

function hasDarkTheme(themes: TypecaseThemeRegistry): boolean {
    return themes.dark != null;
}

function resolveDefaultPreference(props: TypecaseRootProps): TypecaseThemePreference {
    if (props.defaultPreference) {
        return props.defaultPreference;
    }

    const themes = normalizeThemes(props.themes, props.theme);

    if (hasDarkTheme(themes)) {
        return "auto";
    }

    return props.theme?.scheme ?? "light";
}

export class TypecaseRoot extends Component<TypecaseRootProps, TypecaseRootState> {
    static override styles = TYPECASE_BASE_STYLES;

    private lastBroadcastKey: string | null = null;

    protected override initState(): TypecaseRootState {
        return {
            preference: readStoredPreference(this.props.storageKey) ?? resolveDefaultPreference(this.props),
        };
    }

    override onMount(): void {
        this.syncRuntimeBindings();
    }

    override afterRender(): void {
        this.syncRuntimeBindings();
        this.broadcastThemeState();
    }

    private getRootElement(): HTMLElement | null {
        return this.querySelector(".typecase-root");
    }

    private getThemeRegistry(): TypecaseThemeRegistry {
        return normalizeThemes(this.props.themes, this.props.theme);
    }

    private getEffectivePreference(): TypecaseThemePreference {
        return this.props.preference ?? this.state.preference;
    }

    private resolveThemeState() {
        const registry = this.getThemeRegistry();
        const availableSchemes = (Object.keys(registry) as TypecaseThemeScheme[]).filter((scheme) =>
            registry[scheme] != null
        );
        const preference = this.getEffectivePreference();
        const requestedScheme = preference === "auto" ? resolveSystemScheme() : preference;
        const fallbackScheme = registry.light ? "light" : "dark";
        const resolvedScheme = registry[requestedScheme] ? requestedScheme : fallbackScheme;
        const theme = registry[resolvedScheme] ?? lightTheme;

        return {
            availableSchemes,
            preference,
            resolvedScheme,
            theme,
        };
    }

    private syncRuntimeBindings(): void {
        const rootElement = this.getRootElement();

        if (rootElement) {
            this.registerDOMEvent(
                rootElement,
                TYPECASE_THEME_PREFERENCE_REQUEST_EVENT,
                this.handlePreferenceRequest as EventListener,
            );
        }

        if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
            this.registerDOMEvent(
                window.matchMedia("(prefers-color-scheme: dark)"),
                "change",
                this.handleSystemPreferenceChange as EventListener,
            );
        }
    }

    private broadcastThemeState(): void {
        const rootElement = this.getRootElement();

        if (!rootElement) {
            return;
        }

        const { availableSchemes, preference, resolvedScheme, theme } = this.resolveThemeState();
        const detail: TypecaseThemeChangeDetail = {
            availableSchemes,
            preference,
            resolvedScheme,
            themeName: theme.name,
        };
        const broadcastKey = JSON.stringify(detail);

        if (broadcastKey === this.lastBroadcastKey) {
            return;
        }

        this.lastBroadcastKey = broadcastKey;
        this.props.onResolvedThemeChange?.(theme, detail);
        rootElement.dispatchEvent(
            new CustomEvent<TypecaseThemeChangeDetail>(TYPECASE_THEME_CHANGE_EVENT, {
                detail,
            }),
        );
    }

    private handlePreferenceRequest = (event: Event): void => {
        event.stopPropagation();

        const customEvent = event as CustomEvent<{ preference?: TypecaseThemePreference }>;
        const preference = customEvent.detail?.preference;

        if (preference !== "light" && preference !== "dark" && preference !== "auto") {
            return;
        }

        this.props.onPreferenceChange?.(preference);

        if (this.props.preference !== undefined) {
            this.rerender();
            return;
        }

        writeStoredPreference(this.props.storageKey, preference);
        this.setState({ preference });
    };

    private handleSystemPreferenceChange = (): void => {
        if (this.getEffectivePreference() !== "auto") {
            return;
        }

        this.rerender();
    };

    override render() {
        const {
            children,
            className,
            defaultPreference: _defaultPreference,
            onPreferenceChange: _onPreferenceChange,
            onResolvedThemeChange: _onResolvedThemeChange,
            preference: _preference,
            storageKey: _storageKey,
            style,
            theme: _theme,
            themes: _themes,
            ...rest
        } = this.props;
        const { availableSchemes, preference, resolvedScheme, theme } = this.resolveThemeState();

        return (
            <div
                {...rest}
                className={joinClassNames("typecase-root", className)}
                data-typecase-theme={theme.name}
                data-typecase-theme-available={availableSchemes.join(",")}
                data-typecase-theme-preference={preference}
                data-typecase-theme-scheme={resolvedScheme}
                style={mergeStyleAttributes(toThemeStyleAttribute(theme), style)}
            >
                {children}
            </div>
        );
    }
}
