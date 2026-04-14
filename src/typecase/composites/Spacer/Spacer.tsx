import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

export interface SpacerProps {
    className?: string;
    grow?: number | string;
    style?: string;
    [key: string]: unknown;
}

export function Spacer(props: SpacerProps) {
    const {
        className,
        grow = 1,
        style,
        ...rest
    } = props;

    return (
        <div
            {...rest}
            aria-hidden="true"
            className={joinClassNames("tc-spacer", className)}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-spacer-grow": String(grow),
                }),
                style,
            )}
        />
    );
}
