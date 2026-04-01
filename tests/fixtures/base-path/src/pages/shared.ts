export type FixtureRouteContext = {
    locale?: string;
    url?: URL;
    basePath?: string;
};

export function buildLocaleHref(args: {
    route?: FixtureRouteContext;
    nextLocale: "en" | "pt";
}): string {
    const basePath = normalizeBasePath(args.route?.basePath ?? __MAINZ_BASE_PATH__);
    const currentPathname = args.route?.url?.pathname ?? joinBasePath(basePath, "/en/");
    const pathnameWithoutBasePath = stripBasePath(currentPathname, basePath);
    const segments = pathnameWithoutBasePath.split("/").filter(Boolean);

    if (segments.length === 0) {
        return joinBasePath(basePath, `/${args.nextLocale}/`);
    }

    segments[0] = args.nextLocale;
    const nextPath = `/${segments.join("/")}${
        shouldKeepTrailingSlash(pathnameWithoutBasePath) ? "/" : ""
    }`;

    return joinBasePath(basePath, nextPath);
}

function normalizeBasePath(basePath: string): string {
    if (!basePath || basePath === "/") {
        return "/";
    }

    return basePath.endsWith("/") ? basePath : `${basePath}/`;
}

function stripBasePath(pathname: string, basePath: string): string {
    if (basePath === "/") {
        return pathname;
    }

    return pathname.startsWith(basePath) ? pathname.slice(basePath.length - 1) : pathname;
}

function joinBasePath(basePath: string, pathname: string): string {
    if (basePath === "/") {
        return pathname;
    }

    return `${basePath.slice(0, -1)}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function shouldKeepTrailingSlash(pathname: string): boolean {
    return pathname.endsWith("/") || pathname.split("/").filter(Boolean).length <= 1;
}
