import { CustomElement, Page, Route } from "mainz";
import { TutorialPage } from "../components/TutorialPage.tsx";

type CoreContractsRouteProps = {
    route?: {
        locale?: string;
    };
};

@CustomElement("x-mainz-core-contracts-home-page")
@Route("/")
export class CoreContractsHomePage extends Page<CoreContractsRouteProps> {
    static override page = {
        mode: "ssg" as const,
        locales: ["en", "pt"],
        head: {
            title: "Mainz",
        },
    };

    override render() {
        const locale = (this.props.route?.locale ?? "en") as "en" | "pt";
        return <TutorialPage locale={locale} />;
    }
}
