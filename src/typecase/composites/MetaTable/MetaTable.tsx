import { joinClassNames } from "../../utils/class-name.ts";

export interface MetaTableItem {
    label: string;
    value: unknown;
}

export interface MetaTableProps {
    className?: string;
    items: readonly MetaTableItem[];
    [key: string]: unknown;
}

export function MetaTable(props: MetaTableProps) {
    const { className, items, ...rest } = props;

    return (
        <div {...rest} className={joinClassNames("tc-meta-table", className)}>
            {items.map((item) => (
                <div key={item.label} className="tc-meta-table-row">
                    <span className="tc-meta-table-label">{item.label}</span>
                    <span className="tc-meta-table-value">{item.value}</span>
                </div>
            ))}
        </div>
    );
}
