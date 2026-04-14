import { joinClassNames } from "../../utils/class-name.ts";

export type TableDensity = "default" | "compact";
export type TableVariant = "default" | "subtle";
export type TableAlign = "start" | "center" | "end";

export interface TableProps {
    caption?: unknown;
    children?: unknown;
    className?: string;
    density?: TableDensity;
    striped?: boolean;
    tableClassName?: string;
    variant?: TableVariant;
    [key: string]: unknown;
}

export interface TableSectionProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

export interface TableRowProps {
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

export interface TableCellProps {
    align?: TableAlign;
    children?: unknown;
    className?: string;
    [key: string]: unknown;
}

export interface TableHeaderCellProps extends TableCellProps {
    scope?: "col" | "row" | "colgroup" | "rowgroup";
}

function TableRoot(props: TableProps) {
    const {
        caption,
        children,
        className,
        density = "default",
        striped = false,
        tableClassName,
        variant = "default",
        ...rest
    } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-table-shell", className)}
            data-density={density}
            data-striped={striped ? "true" : "false"}
            data-variant={variant}
        >
            <table className={joinClassNames("tc-table", tableClassName)}>
                {caption ? <caption className="tc-table-caption">{caption}</caption> : null}
                {children}
            </table>
        </div>
    );
}

function TableHead(props: TableSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <thead {...rest} className={joinClassNames("tc-table-head", className)}>{children}</thead>
    );
}

function TableBody(props: TableSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <tbody {...rest} className={joinClassNames("tc-table-body", className)}>{children}</tbody>
    );
}

function TableFoot(props: TableSectionProps) {
    const { children, className, ...rest } = props;

    return (
        <tfoot {...rest} className={joinClassNames("tc-table-foot", className)}>{children}</tfoot>
    );
}

function TableRow(props: TableRowProps) {
    const { children, className, ...rest } = props;

    return <tr {...rest} className={joinClassNames("tc-table-row", className)}>{children}</tr>;
}

function TableHeaderCell(props: TableHeaderCellProps) {
    const {
        align = "start",
        children,
        className,
        scope = "col",
        ...rest
    } = props;

    return (
        <th
            {...rest}
            className={joinClassNames("tc-table-header-cell", className)}
            data-align={align}
            scope={scope}
        >
            {children}
        </th>
    );
}

function TableCell(props: TableCellProps) {
    const {
        align = "start",
        children,
        className,
        ...rest
    } = props;

    return (
        <td
            {...rest}
            className={joinClassNames("tc-table-cell", className)}
            data-align={align}
        >
            {children}
        </td>
    );
}

export const Table = Object.assign(TableRoot, {
    Body: TableBody,
    Cell: TableCell,
    Foot: TableFoot,
    Head: TableHead,
    HeaderCell: TableHeaderCell,
    Row: TableRow,
});
