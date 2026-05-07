import {
  CustomElement,
  Locales,
  Page,
  Route,
} from "../../../components/index.ts";

abstract class SuppressionFixturePage extends Page {
  override render() {
    return <div></div>;
  }
}

/**
 * @mainz-diagnostics-ignore
 * invalid-locale-tag: owner-wide suppression for fixture coverage
 */
@CustomElement("x-mainz-owner-wide-locale-suppression-page")
@Route("/owner-wide")
@Locales("pt_BR", "en_US")
export class OwnerWideLocaleSuppressionPage extends SuppressionFixturePage {}

/**
 * @mainz-diagnostics-ignore
 * invalid-locale-tag[locale=pt_BR]: suppress one invalid locale only
 */
@CustomElement("x-mainz-subject-locale-suppression-page")
@Route("/subject-only")
@Locales("pt_BR", "en_US")
export class SubjectScopedLocaleSuppressionPage
  extends SuppressionFixturePage {}

/**
 * @mainz-diagnostics-ignore
 * invalid-locale-tag[token=pt_BR]: invalid subject selector
 */
@CustomElement("x-mainz-invalid-subject-locale-suppression-page")
@Route("/invalid-subject")
@Locales("pt_BR")
export class InvalidSubjectLocaleSuppressionPage
  extends SuppressionFixturePage {}

/**
 * @mainz-diagnostics-ignore
 * invalid-locale-tag[locale=pt_BR]: first reason
 * invalid-locale-tag[locale=pt_BR]: duplicate reason
 */
@CustomElement("x-mainz-duplicate-locale-suppression-page")
@Route("/duplicate-subject")
@Locales("pt_BR")
export class DuplicateSubjectLocaleSuppressionPage
  extends SuppressionFixturePage {}
