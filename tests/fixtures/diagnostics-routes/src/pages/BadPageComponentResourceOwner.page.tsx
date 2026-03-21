import {
    ComponentResource,
    CustomElement,
    defineResource,
    Page,
    RenderMode,
    Route,
} from "mainz";

const currentUserResource = defineResource({
    name: "current-user",
    visibility: "private",
    async load() {
        return { id: "user-1" };
    },
});

@CustomElement("x-mainz-diagnostics-cli-page-component-resource-owner")
@Route("/account")
@RenderMode("ssg")
export class MissingStrategyPageComponentResourceOwner extends Page {
    override render() {
        return (
            <main>
                <ComponentResource resource={currentUserResource} params={undefined}>
                    {() => <p>Account</p>}
                </ComponentResource>
            </main>
        );
    }
}
