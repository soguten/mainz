import { joinClassNames } from "../../utils/class-name.ts";
import {
    detectShortcutPlatform,
    formatShortcutChord,
    normalizeShortcutChord,
    type ShortcutChord,
    type ShortcutPlatform,
} from "../../utils/shortcut.ts";
import { Kbd, type KbdSize } from "../Kbd/index.ts";

export interface ShortcutProps {
    chord: ShortcutChord;
    className?: string;
    platform?: ShortcutPlatform;
    size?: KbdSize;
    [key: string]: unknown;
}

export function Shortcut(props: ShortcutProps) {
    const {
        chord,
        className,
        platform = "auto",
        size = "md",
        ...rest
    } = props;
    const resolvedPlatform = platform === "auto" ? detectShortcutPlatform() : platform;
    const normalizedChord = normalizeShortcutChord(chord, { platform: resolvedPlatform });
    const parts = formatShortcutChord(chord, { platform: resolvedPlatform });

    return (
        <span
            {...rest}
            className={joinClassNames("tc-shortcut", className)}
            data-chord={normalizedChord}
            data-platform={resolvedPlatform}
            data-size={size}
        >
            {parts.map((part) => (
                <Kbd
                    aria-label={part.ariaLabel}
                    data-symbol={part.symbol ? "true" : undefined}
                    size={size}
                >
                    {part.label}
                </Kbd>
            ))}
        </span>
    );
}
