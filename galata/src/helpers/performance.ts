// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Page } from '@playwright/test';

export class PerformanceHelper {
  constructor(readonly page: Page) {}

  startTimer(name: string = 'start'): Promise<void> {
    return this.page.evaluate(`{
      performance.clearMeasures();
      performance.mark('${name}');
    }`);
  }

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
}
