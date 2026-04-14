import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type SectionTag = "div" | "section" | "article" | "main" | "aside";
type SectionGap = "sm" | "md" | "lg" | "xl" | string;

const gapMap: Record<string, string> = {
    "sm": "0.75rem",
    "md": "1rem",
    "lg": "1.5rem",
    "xl": "2rem",
};

export interface SectionProps {
    as?: SectionTag;
    children?: unknown;
    className?: string;
    gap?: SectionGap;
    style?: string;
    [key: string]: unknown;
}

export function Section(props: SectionProps) {
    const {
        as = "section",
        children,
        className,
        gap = "lg",
        style,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-section", className)}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-section-gap": gapMap[gap] ?? gap,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}
