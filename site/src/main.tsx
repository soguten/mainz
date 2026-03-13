import { MainzTutorialPage } from "./components/MainzTutorialPage.tsx";
import { getLocale } from "./i18n/index.ts";

const app = document.querySelector("#app");

if (!app) {
    throw new Error("App container not found");
}

document.documentElement.lang = getLocale();

const tutorialTagName = MainzTutorialPage.getTagName();

if (!customElements.get(tutorialTagName)) {
    customElements.define(tutorialTagName, MainzTutorialPage);
}

const hasPreRenderedTutorial = Boolean(app.querySelector(tutorialTagName));
if (!hasPreRenderedTutorial) {
    app.append(<MainzTutorialPage />);
}
