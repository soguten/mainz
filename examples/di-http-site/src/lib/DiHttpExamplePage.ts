import { Page, type SpaNavigationRenderContext } from "mainz";
import { diHttpExampleStyles } from "./styles.ts";

export interface DiHttpExamplePageProps<Data> {
  data?: Data;
  route?: SpaNavigationRenderContext;
}

export abstract class DiHttpExamplePage<Data = unknown>
  extends Page<DiHttpExamplePageProps<Data>> {
  static override styles = diHttpExampleStyles;
}
