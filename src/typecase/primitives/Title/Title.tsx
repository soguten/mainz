import { joinClassNames } from "../../utils/class-name.ts";

export type TitleSize = "sm" | "md" | "lg" | "xl" | "hero";
export type TitleTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface TitleProps {
    as?: TitleTag;
    children?: unknown;
    className?: string;
    size?: TitleSize;
    [key: string]: unknown;
}

export function Title(props: TitleProps) {
    const {
        as = "h2",
        children,
        className,
        size = "md",
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-title", className)}
            data-size={size}
        >
            {children}
        </Tag>
    );
}
