import type { IconProps } from "./types.ts";

export const MainzIcon = ({ size = 16, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M137.461 46.9434H144.932C165.296 46.9434 177.471 53.8607 181.455 67.6953C182.728 72.1777 183.364 77.3519 183.364 83.2178V160H137.461V46.9434ZM75.8691 46.9434H122.021V160H75.8691V46.9434ZM14.1113 46.9434H60.2637V160H14.1113V46.9434Z" fill="#F7F2EA" />
    </svg>
);
