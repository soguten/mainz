import { joinClassNames } from "../../utils/class-name.ts";

export type TextareaSize = "sm" | "md" | "lg";
export type TextareaResize = "none" | "vertical" | "horizontal" | "both";

export interface TextareaProps {
    className?: string;
    invalid?: boolean;
    resize?: TextareaResize;
    size?: TextareaSize;
    [key: string]: unknown;
}

export function Textarea(props: TextareaProps) {
    const {
        className,
        invalid = false,
        resize = "vertical",
        size = "md",
        ...rest
    } = props;

    return (
        <textarea
            {...rest}
            aria-invalid={invalid ? "true" : undefined}
            className={joinClassNames("tc-textarea", className)}
            data-invalid={invalid ? "true" : undefined}
            data-resize={resize}
            data-size={size}
        />
    );
}
