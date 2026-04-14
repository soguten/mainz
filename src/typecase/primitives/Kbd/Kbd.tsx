import { joinClassNames } from "../../utils/class-name.ts";

export type KbdSize = "sm" | "md";

export interface KbdProps {
    children?: unknown;
    className?: string;
    size?: KbdSize;
    [key: string]: unknown;
}

export function Kbd(props: KbdProps) {
    const { children, className, size = "md", ...rest } = props;

    return (
        <kbd {...rest} className={joinClassNames("tc-kbd", className)} data-size={size}>
            {children}
        </kbd>
    );
}
