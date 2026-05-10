import { Component, CustomElement } from "mainz";

type StorySummaryCardProps = {
  locale: "en" | "pt";
  slug: string;
  summary: string;
};

@CustomElement("x-mainz-routed-di-story-summary-card")
export class StorySummaryCard extends Component<StorySummaryCardProps> {
  override render() {
    const isPortuguese = this.props.locale === "pt";

    return (
      <section
        aria-label={isPortuguese ? "Resumo da historia" : "Story summary"}
      >
        <p data-story-locale>{this.props.locale}</p>
        <p data-story-slug>{this.props.slug}</p>
        <p data-story-summary>{this.props.summary}</p>
      </section>
    );
  }
}
