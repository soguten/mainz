import { joinClassNames } from "../../utils/class-name.ts";

export type DescriptionListLayout = "stacked" | "inline";
export type DescriptionListVariant = "default" | "bordered";

export interface DescriptionListProps {
    children?: unknown;
    className?: string;
    layout?: DescriptionListLayout;
    variant?: DescriptionListVariant;
    [key: string]: unknown;
}

export interface DescriptionListSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

function DescriptionListRoot(props: DescriptionListProps) {
    const {
        children,
        className,
        layout = "stacked",
        variant = "default",
        ...rest
    } = props;

    return (
        <dl
            {...rest}
            className={joinClassNames("tc-description-list", className)}
            data-layout={layout}
            data-variant={variant}
        >
            {children}
        </dl>
    );
}

function DescriptionListItem(props: DescriptionListSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-description-list-item", className)}>
            {children}
        </div>
    );
}

function DescriptionListTerm(props: DescriptionListSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <dt {...rest} className={joinClassNames("tc-description-list-term", className)}>
            {children}
        </dt>
    );
}

function DescriptionListDetails(props: DescriptionListSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <dd {...rest} className={joinClassNames("tc-description-list-details", className)}>
            {children}
        </dd>
    );
}

export const DescriptionList = Object.assign(DescriptionListRoot, {
    Details: DescriptionListDetails,
    Item: DescriptionListItem,
    Term: DescriptionListTerm,
});
