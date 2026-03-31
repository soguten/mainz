import { singleton } from "mainz/di";
import { defineApp, startApp } from "mainz";
import { DiagnosticsDiFixturePage } from "./pages/Home.page.tsx";

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

const app = defineApp({
    pages: [DiagnosticsDiFixturePage],
    services: [
        singleton(RegisteredDependency),
        singleton(
            NeedsMissingDependency,
            ({ get }) => new NeedsMissingDependency(get(MissingDependency)),
        ),
        singleton(CycleA, ({ get }) => new CycleA(get(CycleB))),
        singleton(CycleB, ({ get }) => new CycleB(get(CycleA))),
    ],
});

startApp(app, {
    mount: "#app",
});
