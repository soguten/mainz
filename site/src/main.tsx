import { HomePage } from "./pages/Home.page.tsx";
import { getLocale } from "./i18n/index.ts";

const app = document.querySelector("#app");

if (!app) {
    throw new Error("App container not found");
}

document.documentElement.lang = getLocale();

const pageTagName = HomePage.getTagName();

if (!customElements.get(pageTagName)) {
    customElements.define(pageTagName, HomePage);
}

const hasPreRenderedPage = Boolean(app.querySelector(pageTagName));
if (!hasPreRenderedPage) {
    app.append(<HomePage />);
}
