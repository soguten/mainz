import { joinClassNames } from "../../utils/class-name.ts";

type CardSectionProps = {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
};

export type CardVariant = "default" | "subtle";

export interface CardProps extends CardSectionProps {
    variant?: CardVariant;
}

function CardRoot(props: CardProps) {
    const {
        children,
        className,
        variant = "default",
        ...rest
    } = props;

    return (
        <section
            {...rest}
            className={joinClassNames("tc-card", className)}
            data-variant={variant}
        >
            {children}
        </section>
    );
}

function CardHeader(props: CardSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-card-header", className)}>
            {children}
        </div>
    );
}

function CardTitle(props: CardSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <h3 {...rest} className={joinClassNames("tc-card-title", className)}>
            {children}
        </h3>
    );
}

function CardBody(props: CardSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-card-body", className)}>
            {children}
        </div>
    );
}

function CardFooter(props: CardSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-card-footer", className)}>
            {children}
        </div>
    );
}

export const Card = Object.assign(CardRoot, {
    Body: CardBody,
    Footer: CardFooter,
    Header: CardHeader,
    Title: CardTitle,
});
