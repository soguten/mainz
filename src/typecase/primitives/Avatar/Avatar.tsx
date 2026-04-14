import { joinClassNames } from "../../utils/class-name.ts";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
    alt?: string;
    children?: unknown;
    className?: string;
    size?: AvatarSize;
    src?: string;
    [key: string]: unknown;
}

function getFallbackLabel(alt: string | undefined): string | undefined {
    const trimmed = alt?.trim();

    return trimmed ? trimmed.slice(0, 1).toUpperCase() : undefined;
}

export function Avatar(props: AvatarProps) {
    const { alt, children, className, size = "md", src, ...rest } = props;
    const fallback = children ?? getFallbackLabel(alt);

    return (
        <span
            {...rest}
            aria-label={src ? undefined : alt}
            className={joinClassNames("tc-avatar", className)}
            data-size={size}
            role={src ? undefined : alt ? "img" : undefined}
        >
            {src
                ? <img alt={alt ?? ""} className="tc-avatar-image" src={src} />
                : <span className="tc-avatar-fallback">{fallback}</span>}
        </span>
    );
}
