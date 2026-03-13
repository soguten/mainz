import { Component } from "mainz";
import type { ConceptCardData } from "./types.ts";

export class ConceptCard extends Component<ConceptCardData> {
    static override customElementTag = "x-concept-card";

    override render(): HTMLElement {
        return (
            <article className="concept-card">
                <span className="concept-tag">{this.props.tag}</span>
                <h3>{this.props.title}</h3>
                <p>
                    {this.props.description}
                </p>
            </article>
        );
    }
}
