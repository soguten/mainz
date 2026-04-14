import type { IconProps } from "./types.ts";

export const CircleHalfIcon = ({ size = 16, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" class="bi bi-circle-half" viewBox="0 0 16 16" {...props}>
        {/* Bootstrap Icons v1.11.0 https://icons.getbootstrap.com | License MIT https://github.com/twbs/icons/blob/main/LICENSE */}
        <path d="M8 15A7 7 0 1 0 8 1zm0 1A8 8 0 1 1 8 0a8 8 0 0 1 0 16" />
    </svg>
);
