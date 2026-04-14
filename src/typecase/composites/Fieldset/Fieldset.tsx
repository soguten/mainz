import { joinClassNames } from "../../utils/class-name.ts";

export interface FieldsetProps {
    children?: unknown;
    className?: string;
    invalid?: boolean;
    [key: string]: unknown;
}

export interface FieldsetSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

function FieldsetRoot(props: FieldsetProps) {
    const {
        children,
        className,
        invalid = false,
        ...rest
    } = props;

    return (
        <fieldset
            {...rest}
            className={joinClassNames("tc-fieldset", className)}
            data-invalid={invalid ? "true" : "false"}
        >
            {children}
        </fieldset>
    );
}

function FieldsetLegend(props: FieldsetSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <legend {...rest} className={joinClassNames("tc-fieldset-legend", className)}>
            {children}
        </legend>
    );
}

function FieldsetBody(props: FieldsetSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-fieldset-body", className)}>
            {children}
        </div>
    );
}

function FieldsetHint(props: FieldsetSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <p {...rest} className={joinClassNames("tc-fieldset-hint", className)}>
            {children}
        </p>
    );
}

function FieldsetError(props: FieldsetSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <p {...rest} className={joinClassNames("tc-fieldset-error", className)} role="alert">
            {children}
        </p>
    );
}

export const Fieldset = Object.assign(FieldsetRoot, {
    Body: FieldsetBody,
    Error: FieldsetError,
    Hint: FieldsetHint,
    Legend: FieldsetLegend,
});
