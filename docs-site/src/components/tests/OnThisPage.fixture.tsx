import { Component } from "mainz";
import { OnThisPage } from "../OnThisPage.tsx";

export class OnThisPageHarness extends Component {
    override render() {
        return (
            <>
                <div class="docs-article-body">
                    <h2 id="overview" class="docs-section-heading">Overview</h2>
                    <h3 id="details" class="docs-subheading">Details</h3>
                </div>
                <OnThisPage slug="quickstart" />
            </>
        );
    }
}
