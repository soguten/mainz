import { Component, defineApp, startApp } from "mainz";
import { CheckedScenario } from "./checked-scenario.tsx";
import { Counter } from "./counter.tsx";
import { InputValueScenario } from "./input-value-scenario.tsx";
import { ListIdentityScenario } from "./list-identity-scenario.tsx";
import { ListenerLeakScenario } from "./listener-leak-scenario.tsx";
import { StaleInlineHandlerCounter } from "./StaleInlineHandlerCounter.tsx";

class PlaygroundRoot extends Component {
    override render() {
        return (
            <>
                <Counter initial={10} />
                <ListIdentityScenario />
                <ListenerLeakScenario />
                <InputValueScenario />
                <CheckedScenario />
                <StaleInlineHandlerCounter />
            </>
        );
    }
}

const playgroundApp = defineApp({
    id: "playground",
    root: PlaygroundRoot,
});

if (typeof document !== "undefined") {
    bootstrapPlayground();
}

function bootstrapPlayground(): void {
    const mount = document.getElementById("app");
    if (!mount) {
        throw new Error('Playground mount element "#app" was not found.');
    }

    startApp(playgroundApp, {
        mount,
    });
}
