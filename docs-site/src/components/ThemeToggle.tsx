import { Component, CustomElement } from "mainz";

type ThemeName = "light" | "dark";

interface ThemeToggleState {
    theme: ThemeName;
}

const STORAGE_KEY = "mainz-docs-theme";

@CustomElement("x-mainz-docs-theme-toggle")
export class ThemeToggle extends Component<Record<string, never>, ThemeToggleState> {
    
    protected override initState(): ThemeToggleState {
        return {
            theme: readCurrentTheme(),
        };
    }

    override render() {
        const nextTheme = this.state.theme === "dark" ? "light" : "dark";
        const label = this.state.theme === "dark" ? "Switch to light" : "Switch to dark";

        return (
            <button
                type="button"
                class="theme-toggle"
                data-theme-toggle={nextTheme}
                aria-label={label}
                onClick={() => this.toggleTheme()}
            >
                {this.state.theme === "dark" ? "Dark mode" : "Light mode"}
            </button>
        );
    }

    private toggleTheme(): void {
        const nextTheme: ThemeName = this.state.theme === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
        this.setState({ theme: nextTheme });
    }
}

function readCurrentTheme(): ThemeName {
    const activeTheme = document.documentElement.dataset.theme;
    return activeTheme === "dark" ? "dark" : "light";
}

function applyTheme(theme: ThemeName): void {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // Ignore storage failures in non-browser environments.
    }
}
