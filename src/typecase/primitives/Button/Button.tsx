import { joinClassNames } from "../../utils/class-name.ts";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
    children?: unknown;
    className?: string;
    disabled?: boolean;
    href?: string;
    onClick?: (event: Event) => void;
    size?: ButtonSize;
    type?: "button" | "submit" | "reset";
    variant?: ButtonVariant;
    [key: string]: unknown;
}

export function Button(props: ButtonProps) {
    const {
        children,
        className,
        disabled,
        href,
        onClick,
        size = "md",
        type = "button",
        variant = "primary",
        ...rest
    } = props;

    if (href) {
        return (
            <a
                {...rest}
                aria-disabled={disabled ? "true" : undefined}
                className={joinClassNames("tc-button", className)}
                data-size={size}
                data-variant={variant}
                href={href}
                onClick={onClick}
            >
                {children}
            </a>
        );
    }

    return (
        <button
            {...rest}
            className={joinClassNames("tc-button", className)}
            data-size={size}
            data-variant={variant}
            disabled={disabled}
            onClick={onClick}
            type={type}
        >
            {children}
        </button>
    );
}
