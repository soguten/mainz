import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";
import { TutorialPage } from "../components/TutorialPage.tsx";

type CoreContractsRouteProps = {
    route?: {
        locale?: string;
    };
};

@CustomElement("x-mainz-core-contracts-home-page")
@Route("/")
@RenderMode("ssg")
@Locales("en", "pt")
export class CoreContractsHomePage extends Page<CoreContractsRouteProps> {
    static override page = {
        head: {
            title: "Mainz",
        },
    };

    override render() {
        const locale = (this.props.route?.locale ?? "en") as "en" | "pt";
        return <TutorialPage locale={locale} />;
    }
}
