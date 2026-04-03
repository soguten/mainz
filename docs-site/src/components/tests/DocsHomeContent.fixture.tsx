import { Page } from "mainz";
import { createServiceContainer, singleton } from "../../../../src/di/index.ts";
import { attachServiceContainer } from "../../../../src/di/context.ts";
import { DocsHomeContent } from "../DocsHomeContent.tsx";
import { DocsService } from "../../services/DocsService.ts";

const serviceContainer = createServiceContainer([
    singleton(DocsService),
]);

export class DocsHomeContentRouteHost extends Page {
    constructor() {
        super();
        attachServiceContainer(this, serviceContainer);
    }

    override render() {
        return <DocsHomeContent />;
    }
}
