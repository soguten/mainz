import { Page, type SpaNavigationRenderContext } from "mainz";
import type { AuthorizeSiteShellData } from "./page-data.ts";
import { authorizeSiteStyles } from "./styles.ts";

export interface AuthorizeSitePageProps {
    data?: AuthorizeSiteShellData;
    route?: SpaNavigationRenderContext;
}

export abstract class AuthorizeSitePage extends Page<AuthorizeSitePageProps> {
    static override styles = authorizeSiteStyles;
}
