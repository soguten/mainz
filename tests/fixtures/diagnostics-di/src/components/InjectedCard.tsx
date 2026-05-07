import { Component } from "mainz";
import { inject } from "mainz/di";

class MissingApi {
}

export class DiInjectedCard extends Component {
  readonly api = inject(MissingApi);

  render() {
    return <div>DI</div>;
  }
}
