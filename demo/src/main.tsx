import { CheckedScenario } from "./checked-scenario.tsx";
import { Counter } from "./counter.tsx";
import { InputValueScenario } from "./input-value-scenario.tsx";
import { ListIdentityScenario } from "./list-identity-scenario.tsx";
import { ListenerLeakScenario } from "./listener-leak-scenario.tsx";

const app = document.getElementById("app")!;

app.append(<Counter initial={0} />);

app.append(<ListIdentityScenario />);
app.append(<ListenerLeakScenario />);
app.append(<InputValueScenario />);
app.append(<CheckedScenario />);

