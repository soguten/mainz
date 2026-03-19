import { customElement, Page, route } from "mainz";
import { TutorialPage } from "../components/TutorialPage.tsx";

type CoreContractsRouteProps = {
    route?: {
        locale?: string;
    };
};

@customElement("x-mainz-core-contracts-home-page")
@route("/")
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
