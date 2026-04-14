import { startNavigation } from "mainz";
import { CheckedScenario } from "./checked-scenario.tsx";
import { Counter } from "./counter.tsx";
import { InputValueScenario } from "./input-value-scenario.tsx";
import { ListIdentityScenario } from "./list-identity-scenario.tsx";
import { ListenerLeakScenario } from "./listener-leak-scenario.tsx";
import { StaleInlineHandlerCounter } from "./StaleInlineHandlerCounter.tsx";

if (typeof document !== "undefined") {
    bootstrapPlayground();
}

function bootstrapPlayground(): void {
    const app = document.getElementById("app");
    if (!app) {
        throw new Error('Playground mount element "#app" was not found.');
    }

    startNavigation({
        mode: __MAINZ_NAVIGATION_MODE__,
        basePath: __MAINZ_BASE_PATH__,
    });

    app.append(<Counter initial={10} />);

    app.append(<ListIdentityScenario />);
    app.append(<ListenerLeakScenario />);
    app.append(<InputValueScenario />);
    app.append(<CheckedScenario />);

    app.append(<StaleInlineHandlerCounter />);
}
