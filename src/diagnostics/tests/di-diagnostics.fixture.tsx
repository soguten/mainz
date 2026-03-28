import { Component, Page, RenderMode, startApp } from "mainz";
import { inject, singleton } from "mainz/di";

class MissingApi {
}

class MissingDependency {
}

class RegisteredDependency {
}

class NeedsMissingDependency {
    constructor(_dependency: MissingDependency) {
    }
}

class CycleA {
    constructor(_dependency: CycleB) {
    }
}

class CycleB {
    constructor(_dependency: CycleA) {
    }
}

abstract class DiagnosticsComponentFixture extends Component {
    override render() {
        return <div></div>;
    }
}

abstract class DiagnosticsPageFixture extends Page {
    override render() {
        return <div></div>;
    }
}

export class InjectedWidget extends DiagnosticsComponentFixture {
    readonly api = inject(MissingApi);
}

@RenderMode("csr")
export class DiagnosticsDiPage extends DiagnosticsPageFixture {
    static readonly api = inject(MissingApi);
}

const services = [
    singleton(RegisteredDependency, () => new RegisteredDependency()),
    singleton(NeedsMissingDependency, ({ get }) => new NeedsMissingDependency(get(MissingDependency))),
    singleton(CycleA, ({ get }) => new CycleA(get(CycleB))),
    singleton(CycleB, ({ get }) => new CycleB(get(CycleA))),
];

startApp({
    mount: "#app",
    pages: [DiagnosticsDiPage],
    services,
});
