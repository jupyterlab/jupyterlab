// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Page } from '@playwright/test';

interface IUnusedStyleCheckOptions {
  /**
   * List of rule fragments to match rules for runtime checks.
   */
  fragments: string[];
  /**
   * List of fragments to filter out rules which cannot (easily) be checked at runtime.
   */
  exclude?: string[];
  /**
   * Whether to check rules with pseudo-classes.
   *
   * Default: false.
   */
  includePseudoClasses?: boolean;
  /**
   * Whether to include rules matching mod classes (`jp-mod-` and `.lm-mod-`).
   *
   * Default: false.
   */
  includeModifiers?: boolean;
}

/**
 * CSS Style analysis helpers
 */
export class StyleHelper {
  constructor(readonly page: Page) {}

  /**
   * Collect all CSS selectors on page.
   */
  async collectAllSelectors(): Promise<string[]> {
    return this.page.evaluate(() =>
      [...document.querySelectorAll('style')]
        .filter(style => style.sheet !== null)
        .map(style => [...style.sheet!.cssRules])
        .flat()
        .filter((rule: CSSRule) => rule instanceof CSSStyleRule)
        .map((rule: CSSStyleRule) => rule.selectorText)
    );
  }

  /**
   * Find unused CSS rules.
   *
   * @param options spcify which rules to include/exclude.
   * @returns List of rules with no matching elements on the page.
   */
  async findUnusedStyleRules(
    options: IUnusedStyleCheckOptions
  ): Promise<string[]> {
    let exclude = typeof options.exclude !== 'undefined' ? options.exclude : [];
    if (!options.includeModifiers) {
      exclude = [...exclude, ...['.jp-mod-', '.lm-mod-']];
    }
    const relevantRules = (await this.collectAllSelectors())
      // detection of pseudo-elements with `document.querySelector` is impossible,
      // so we just check their parents
      .map(selector =>
        selector.replace(
          /::?(after|before|backdrop|cue|cue-region|first-letter|first-line|file-selector-button|marker|placeholder|selection)/,
          ''
        )
      )
      .filter(selector =>
        options.includePseudoClasses ? true : !selector.match(/:\w+/)
      )
      .filter(selector =>
        options.fragments.some(fragment => selector.includes(fragment))
      )
      .filter(
        selector => !exclude.some(fragment => selector.includes(fragment))
      );
    const potentiallyUnusedRules = await this.page.evaluate(
      relevantRules =>
        relevantRules.filter(
          selector => document.querySelector(selector) == null
        ),
      relevantRules
    );
    if (potentiallyUnusedRules.length !== 0) {
      console.log(
        potentiallyUnusedRules.length,
        'out of',
        relevantRules.length,
        'CSS rules for',
        options.fragments,
        'may be unused:',
        potentiallyUnusedRules
      );
    }
    return potentiallyUnusedRules;
  }
}
