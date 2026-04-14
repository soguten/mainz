import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type ScreenTag = "div" | "section" | "main";

export interface ScreenProps {
    as?: ScreenTag;
    background?: string;
    children?: unknown;
    className?: string;
    color?: string;
    minHeight?: string;
    style?: string;
    [key: string]: unknown;
}

function ScreenRoot(props: ScreenProps) {
    const {
        as = "div",
        background,
        children,
        className,
        color,
        minHeight,
        style,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-screen", className)}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-screen-background": background,
                    "--tc-screen-color": color,
                    "--tc-screen-min-height": minHeight,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}

export const Screen = ScreenRoot;
