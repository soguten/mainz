import { Anchor } from "../../primitives/index.ts";
import { joinClassNames } from "../../utils/class-name.ts";

export interface CommandPaletteProps {
    children?: unknown;
    className?: string;
    open?: boolean;
    style?: string;
    [key: string]: unknown;
}

export interface CommandPaletteDialogProps {
    children?: unknown;
    className?: string;
    label?: string;
    onBackdropClick?: (event: Event) => void;
    style?: string;
    [key: string]: unknown;
}

export interface CommandPalettePanelProps {
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
}

export interface CommandPaletteInputShellProps {
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
}

export interface CommandPaletteResultsProps {
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
}

export interface CommandPaletteItemProps {
    active?: boolean;
    children?: unknown;
    className?: string;
    href: string;
    onSelect?: (event: Event) => void;
    style?: string;
    [key: string]: unknown;
}

export function CommandPalette(props: CommandPaletteProps) {
    const { children, className, open = false, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-command-palette", className)}
            data-open={open ? "true" : "false"}
            style={style}
        >
            {children}
        </div>
    );
}

export function CommandPaletteDialog(props: CommandPaletteDialogProps) {
    const { children, className, label = "Command palette", onBackdropClick, style, ...rest } =
        props;

    return (
        <div
            {...rest}
            aria-label={label}
            aria-modal="true"
            className={joinClassNames("tc-command-palette-backdrop", className)}
            onClick={onBackdropClick}
            role="dialog"
            style={style}
        >
            {children}
        </div>
    );
}

export function CommandPalettePanel(props: CommandPalettePanelProps) {
    const { children, className, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-command-palette-panel", className)}
            style={style}
        >
            {children}
        </div>
    );
}

export function CommandPaletteInputShell(props: CommandPaletteInputShellProps) {
    const { children, className, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-command-palette-input-shell", className)}
            style={style}
        >
            {children}
        </div>
    );
}

export function CommandPaletteResults(props: CommandPaletteResultsProps) {
    const { children, className, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-command-palette-results", className)}
            style={style}
        >
            {children}
        </div>
    );
}

export function CommandPaletteItem(props: CommandPaletteItemProps) {
    const { active = false, children, className, href, onSelect, style, ...rest } = props;

    return (
        <Anchor
            {...rest}
            className={joinClassNames("tc-command-palette-item", className)}
            data-active={active ? "true" : "false"}
            href={href}
            onClick={onSelect}
            style={style}
        >
            {children}
        </Anchor>
    );
}

CommandPalette.Dialog = CommandPaletteDialog;
CommandPalette.Panel = CommandPalettePanel;
CommandPalette.InputShell = CommandPaletteInputShell;
CommandPalette.Results = CommandPaletteResults;
CommandPalette.Item = CommandPaletteItem;
