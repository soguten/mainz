import { joinClassNames } from "../../utils/class-name.ts";

export type FigureAlign = "start" | "center";

export interface FigureProps {
    align?: FigureAlign;
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

export interface FigureSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

function FigureRoot(props: FigureProps) {
    const { align = "start", children, className, ...rest } = props;

    return (
        <figure
            {...rest}
            className={joinClassNames("tc-figure", className)}
            data-align={align}
        >
            {children}
        </figure>
    );
}

function FigureCaption(props: FigureSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <figcaption {...rest} className={joinClassNames("tc-figure-caption", className)}>
            {children}
        </figcaption>
    );
}

export const Figure = Object.assign(FigureRoot, {
    Caption: FigureCaption,
});
