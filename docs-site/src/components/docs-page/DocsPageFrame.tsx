import { Component, CustomElement } from "mainz";
import { docsStyles } from "../../styles/docsStyles.ts";

interface DocsPageFrameProps {
    topbar: Node;
    sidebar: Node;
    main: Node;
    rail?: Node | null;
}

@CustomElement("x-mainz-docs-page-frame")
export class DocsPageFrame extends Component<DocsPageFrameProps> {
    static override styles = docsStyles;

    override render() {
        return (
            <div class="docs-app">
                <div class="docs-frame">
                    {this.props.topbar}

                    <div class={`docs-grid${this.props.rail ? " has-rail" : ""}`}>
                        {this.props.sidebar}
                        {this.props.main}
                        {this.props.rail ?? null}
                    </div>
                </div>
            </div>
        );
    }
}
