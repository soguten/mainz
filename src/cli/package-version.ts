/**
 * Resolves the published Mainz package specifier used by generated projects.
 */
export async function resolvePublishedMainzSpecifier(moduleUrl: string): Promise<string> {
    const publishedSpecifier = resolvePublishedMainzSpecifierFromModuleUrl(moduleUrl);
    if (publishedSpecifier) {
        return publishedSpecifier;
    }

    const version = await readPackageVersion(moduleUrl);
    return `jsr:@mainz/mainz@${version}`;
}

/**
 * Resolves the package specifier directly from a JSR-hosted module URL.
 */
export function resolvePublishedMainzSpecifierFromModuleUrl(moduleUrl: string): string | undefined {
    const version = resolvePublishedMainzVersionFromModuleUrl(moduleUrl);
    return version ? `jsr:@mainz/mainz@${version}` : undefined;
}

function resolvePublishedMainzVersionFromModuleUrl(moduleUrl: string): string | undefined {
    let url: URL;
    try {
        url = new URL(moduleUrl);
    } catch {
        return undefined;
    }

    if (url.protocol !== "https:" || url.hostname !== "jsr.io") {
        return undefined;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0] !== "@mainz") {
        return undefined;
    }

    if (!segments[1]?.startsWith("mainz") && !segments[1]?.startsWith("platform-")) {
        return undefined;
    }

    return segments[2] || undefined;
}

async function readPackageVersion(moduleUrl: string): Promise<string> {
    const packageConfigUrl = new URL("../../jsr.json", moduleUrl);
    if (packageConfigUrl.protocol !== "file:") {
        throw new Error(`Could not resolve Mainz package version from ${moduleUrl}.`);
    }

    const packageConfig = JSON.parse(await Deno.readTextFile(packageConfigUrl)) as {
        version?: unknown;
    };
    if (typeof packageConfig.version !== "string" || packageConfig.version.length === 0) {
        throw new Error("Could not resolve Mainz package version from jsr.json.");
    }

    return packageConfig.version;
}
