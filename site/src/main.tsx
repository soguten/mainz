import { MainzTutorialPage } from "./components/MainzTutorialPage.tsx";
import { getLocale } from "./i18n/index.ts";

const app = document.querySelector("#app");

if (!app) {
    throw new Error("App container not found");
}

document.documentElement.lang = getLocale();
app.append(<MainzTutorialPage />);
