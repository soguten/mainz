import { ChevronDownIcon } from "../../icons/index.ts";
import { joinClassNames } from "../../utils/class-name.ts";

export interface AccordionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

export interface AccordionItemProps {
    children?: unknown;
    className?: string;
    open?: boolean;
    [key: string]: unknown;
}

export interface AccordionSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

function AccordionRoot(props: AccordionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-accordion", className)}>
            {children}
        </div>
    );
}

function AccordionItem(props: AccordionItemProps) {
    const { children, className, open = false, ...rest } = props;

    return (
        <details
            {...rest}
            className={joinClassNames("tc-accordion-item", className)}
            open={open}
        >
            {children}
        </details>
    );
}

function AccordionTrigger(props: AccordionSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <summary {...rest} className={joinClassNames("tc-accordion-trigger", className)}>
            <span className="tc-accordion-trigger-label">{children}</span>
            <ChevronDownIcon aria-hidden="true" className="tc-accordion-trigger-icon" size={16} />
        </summary>
    );
}

function AccordionPanel(props: AccordionSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-accordion-panel", className)}>
            {children}
        </div>
    );
}

export const Accordion = Object.assign(AccordionRoot, {
    Item: AccordionItem,
    Panel: AccordionPanel,
    Trigger: AccordionTrigger,
});
