import { joinClassNames } from "../../utils/class-name.ts";

export interface FieldProps {
    children?: unknown;
    className?: string;
    invalid?: boolean;
    [key: string]: unknown;
}

export interface FieldSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

export interface FieldLabelProps extends FieldSectionProps {
    required?: boolean;
}

function FieldRoot(props: FieldProps) {
    const {
        children,
        className,
        invalid = false,
        ...rest
    } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-field", className)}
            data-invalid={invalid ? "true" : "false"}
        >
            {children}
        </div>
    );
}

function FieldLabel(props: FieldLabelProps) {
    const {
        children,
        className,
        required = false,
        ...rest
    } = props;

    return (
        <label
            {...rest}
            className={joinClassNames("tc-field-label", className)}
            data-required={required ? "true" : "false"}
        >
            {children}
        </label>
    );
}

function FieldControl(props: FieldSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-field-control", className)}>
            {children}
        </div>
    );
}

function FieldHint(props: FieldSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <p {...rest} className={joinClassNames("tc-field-hint", className)}>
            {children}
        </p>
    );
}

function FieldError(props: FieldSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <p {...rest} className={joinClassNames("tc-field-error", className)} role="alert">
            {children}
        </p>
    );
}

export const Field = Object.assign(FieldRoot, {
    Control: FieldControl,
    Error: FieldError,
    Hint: FieldHint,
    Label: FieldLabel,
});
