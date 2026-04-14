import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type ContainerTag = "div" | "section" | "main" | "header" | "nav" | "footer";
type ContainerWidth = "md" | "lg" | "xl" | "2xl" | "full" | string;
type ContainerPadding = "sm" | "md" | "lg" | string;

const widthMap: Record<string, string> = {
    "md": "48rem",
    "lg": "64rem",
    "xl": "72rem",
    "2xl": "84rem",
    "full": "100%",
};

const paddingMap: Record<string, string> = {
    "sm": "0.75rem",
    "md": "1rem",
    "lg": "1.5rem",
};

export interface ContainerProps {
    as?: ContainerTag;
    children?: unknown;
    className?: string;
    maxWidth?: ContainerWidth;
    padding?: ContainerPadding;
    style?: string;
    [key: string]: unknown;
}

export function Container(props: ContainerProps) {
    const {
        as = "div",
        children,
        className,
        maxWidth = "xl",
        padding = "md",
        style,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-container", className)}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-container-max-width": widthMap[maxWidth] ?? maxWidth,
                    "--tc-container-padding": paddingMap[padding] ?? padding,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}
