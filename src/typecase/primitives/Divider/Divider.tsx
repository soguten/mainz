import { joinClassNames } from "../../utils/class-name.ts";

export interface DividerProps {
    className?: string;
    [key: string]: unknown;
}

export function Divider(props: DividerProps) {
    const { className, ...rest } = props;

    return <hr {...rest} className={joinClassNames("tc-divider", className)} />;
}
