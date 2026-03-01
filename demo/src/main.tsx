import { Counter } from "./counter.tsx";

const app = document.getElementById("app")!;
app.append(<Counter initial={0} />);