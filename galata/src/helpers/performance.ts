// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Page } from '@playwright/test';
import { UUID } from '@lumino/coreutils';

/**
 * Performance helper
 */
export class PerformanceHelper {
  constructor(readonly page: Page) {}

  /**
   * Clear all measures and place a mark
   *
   * @param name Mark
   */
  startTimer(name: string = 'start'): Promise<void> {
    return this.page.evaluate(`{
      performance.clearMeasures();
      performance.mark('${name}');
    }`);
  }

  /**
   * Get the duration since the mark has been created
   *
   * @param startMark Mark
   * @param name Measure
   * @returns Measure value
   */
  async endTimer(
    startMark: string = 'start',
    name: string = 'duration'
  ): Promise<number> {
    await this.page.evaluate(`performance.measure('${name}', '${startMark}')`);
    const time: number = await this.page.evaluate(
      `performance.getEntriesByName('${name}')[0].duration`
    );
    return time;
  }

  /**
   * Measure the time to execute a function using web browser performance API.
   *
   * @param fn Function to measure
   * @returns The duration to execute the function
   */
  async measure(fn: () => Promise<void>): Promise<number> {
    const mark = UUID.uuid4();
    await this.startTimer(mark);

    await fn();

    return this.endTimer(mark);
  }
}
