import { inject } from "mainz/di";

class MissingDependency {
}

export default class NeedsMissingDependency {
  readonly dependency = inject(MissingDependency);
}
