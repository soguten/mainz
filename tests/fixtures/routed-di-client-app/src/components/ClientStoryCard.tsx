import { Component, CustomElement } from "mainz";

type ClientStoryCardProps = {
    slug: string;
    summary: string;
};

@CustomElement("x-mainz-routed-di-client-story-card")
export class ClientStoryCard extends Component<ClientStoryCardProps> {
    override render() {
        return (
            <section aria-label="Client summary">
                <p data-client-story-slug>{this.props.slug}</p>
                <p data-client-story-summary>{this.props.summary}</p>
            </section>
        );
    }
}
