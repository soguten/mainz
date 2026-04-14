import { Component } from "mainz";
import { TypecaseRoot } from "mainz/typecase";
import { TypecaseDocsSnippet } from "../TypecaseDocsSnippet.tsx";

export class TypecaseDocsSnippetFixture extends Component {
    override render(): HTMLElement | DocumentFragment {
        return (
            <TypecaseRoot>
                <TypecaseDocsSnippet
                    code={`const greeting = "hello";
console.log(greeting);`}
                    language="ts"
                />
            </TypecaseRoot>
        );
    }
}
