import { Component, defineApp, Page, RenderMode, startApp } from "mainz";
import { inject, singleton } from "mainz/di";

class MissingApi {
}

class MissingDependency {
}

class RegisteredDependency {
}

abstract class UsesRegisteredDependencyApi {
}

class UsesRegisteredDependencyService extends UsesRegisteredDependencyApi {
    readonly dependency = inject(RegisteredDependency);
}

class NeedsMissingDependency {
    readonly dependency = inject(MissingDependency);
}

class CycleA {
    readonly dependency = inject(CycleB);
}

class CycleB {
    readonly dependency = inject(CycleA);
}

abstract class DiagnosticsFixtureComponent extends Component {
    override render() {
        return <div></div>;
    }
}

abstract class DiagnosticsFixturePage extends Page {
    override render() {
        return <div></div>;
    }
}

export class InjectedWidget extends DiagnosticsFixtureComponent {
    readonly api = inject(MissingApi);
}

@RenderMode("csr")
export class DiagnosticsDiFixturePage extends DiagnosticsFixturePage {
    static readonly api = inject(MissingApi);
}

const app = defineApp({
    id: "di-diagnostics",
    pages: [DiagnosticsDiFixturePage],
    services: [
        singleton(RegisteredDependency),
        singleton(UsesRegisteredDependencyApi, UsesRegisteredDependencyService),
        singleton(NeedsMissingDependency),
        singleton(CycleA),
        singleton(CycleB),
    ],
});

startApp(app, {
    mount: "#app",
});
