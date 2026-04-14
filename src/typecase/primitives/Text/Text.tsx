import { joinClassNames } from "../../utils/class-name.ts";

export type TextTone = "default" | "muted";
export type TextWeight = "regular" | "medium" | "semibold";
export type TextTag = "span" | "p" | "label" | "small" | "strong";

export interface TextProps {
    as?: TextTag;
    children?: unknown;
    className?: string;
    tone?: TextTone;
    weight?: TextWeight;
    [key: string]: unknown;
}

export function Text(props: TextProps) {
    const {
        as = "span",
        children,
        className,
        tone = "default",
        weight = "regular",
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-text", className)}
            data-tone={tone}
            data-weight={weight}
        >
            {children}
        </Tag>
    );
}
