import { joinClassNames } from "../../utils/class-name.ts";

export type AnchorTone = "default" | "muted";

export interface AnchorProps {
    children?: unknown;
    className?: string;
    href: string;
    tone?: AnchorTone;
    [key: string]: unknown;
}

export function Anchor(props: AnchorProps) {
    const {
        children,
        className,
        href,
        tone = "default",
        ...rest
    } = props;

    return (
        <a
            {...rest}
            className={joinClassNames("tc-anchor", className)}
            data-tone={tone}
            href={href}
        >
            {children}
        </a>
    );
}
