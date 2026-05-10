import { Page, RenderMode, Route } from "mainz";
import { inject } from "mainz/di";
import { DiInjectedCard } from "../components/InjectedCard.tsx";

class MissingApi {
}

@Route("/")
@RenderMode("csr")
export class DiagnosticsDiFixturePage extends Page {
  static readonly api = inject(MissingApi);

  render() {
    return <di-card />;
  }
}

void DiInjectedCard;
