import { Anchor } from "../../primitives/index.ts";
import { joinClassNames } from "../../utils/class-name.ts";

export interface PaletteProps {
    children?: unknown;
    className?: string;
    open?: boolean;
    style?: string;
    [key: string]: unknown;
}

export interface PaletteDialogProps {
    children?: unknown;
    className?: string;
    label?: string;
    onBackdropClick?: (event: Event) => void;
    style?: string;
    [key: string]: unknown;
}

export interface PalettePanelProps {
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
}

export interface PaletteInputShellProps {
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
}

export interface PaletteResultsProps {
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
}

export interface PaletteItemProps {
    active?: boolean;
    children?: unknown;
    className?: string;
    href: string;
    onSelect?: (event: Event) => void;
    style?: string;
    [key: string]: unknown;
}

export function Palette(props: PaletteProps) {
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

export function PaletteDialog(props: PaletteDialogProps) {
    const { children, className, label = "Palette", onBackdropClick, style, ...rest } = props;

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

export function PalettePanel(props: PalettePanelProps) {
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

export function PaletteInputShell(props: PaletteInputShellProps) {
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

export function PaletteResults(props: PaletteResultsProps) {
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

export function PaletteItem(props: PaletteItemProps) {
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

Palette.Dialog = PaletteDialog;
Palette.Panel = PalettePanel;
Palette.InputShell = PaletteInputShell;
Palette.Results = PaletteResults;
Palette.Item = PaletteItem;
