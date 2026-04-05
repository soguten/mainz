import { Component } from "mainz";
import { inject } from "mainz/di";

class MissingApi {
}

abstract class SuppressionFixtureComponent extends Component {
    override render() {
        return <div></div>;
    }
}

/**
 * @mainz-diagnostics-ignore
 * di-token-not-registered[token=MissingApi]: fixture intentionally suppresses one missing token
 */
export class SuppressedInjectedWidget extends SuppressionFixtureComponent {
    readonly api = inject(MissingApi);
}

export class UnsuppressedInjectedWidget extends SuppressionFixtureComponent {
    readonly api = inject(MissingApi);
}
