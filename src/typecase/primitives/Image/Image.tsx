import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

export type ImageFit = "cover" | "contain" | "fill" | "none" | "scale-down";
export type ImageRadius = "none" | "sm" | "md" | "lg" | "full";

export interface ImageProps {
    alt?: string;
    aspectRatio?: string;
    className?: string;
    fit?: ImageFit;
    height?: string;
    radius?: ImageRadius;
    src?: string;
    style?: string;
    width?: string;
    [key: string]: unknown;
}

export function Image(props: ImageProps) {
    const {
        aspectRatio,
        className,
        fit = "cover",
        height,
        radius = "md",
        style,
        width,
        ...rest
    } = props;

    return (
        <img
            {...rest}
            className={joinClassNames("tc-image", className)}
            data-fit={fit}
            data-radius={radius}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-image-aspect-ratio": aspectRatio,
                    "--tc-image-height": height,
                    "--tc-image-width": width,
                }),
                style,
            )}
        />
    );
}
