import { Page, type Principal, type SpaNavigationRenderContext } from "mainz";
import type { AuthorizeSiteShellData } from "./page-data.ts";
import { authorizeSiteStyles } from "./styles.ts";

export interface AuthorizeSitePageProps {
    data?: AuthorizeSiteShellData;
    route?: SpaNavigationRenderContext;
}

export abstract class AuthorizeSitePage extends Page<AuthorizeSitePageProps> {
    static override styles = authorizeSiteStyles;
}

export async function loadAuthorizeSitePage(args: {
    principal?: Principal;
    url: URL;
}): Promise<AuthorizeSiteShellData> {
    const { loadAuthorizeSiteShellData } = await import("./page-data.ts");
    return await loadAuthorizeSiteShellData(args);
}
