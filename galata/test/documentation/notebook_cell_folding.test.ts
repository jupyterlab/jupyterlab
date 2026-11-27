// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  // Narrow, so that the cells fit the documentation page, but wider than
  // 760px, below which the notebook switches to its mobile layout.
  viewport: { height: 600, width: 800 }
});

test.describe('Notebook Cell Folding', () => {
  test('Cell folding with first line visible', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    await page.notebook.createNew();

    await page.notebook.setCell(
      0,
      'code',
      `# Import libraries
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Load and process data
df = pd.read_csv('data.csv')
df.head()`
    );

    await page.notebook.addCell(
      'code',
      `# Data visualization
fig, ax = plt.subplots(figsize=(10, 6))
ax.plot(df['x'], df['y'])
ax.set_title('Sample Plot')
ax.set_xlabel('X axis')
ax.set_ylabel('Y axis')
plt.show()`
    );

    await page.notebook.addCell(
      'code',
      `# Statistical analysis
mean_value = df['column'].mean()
std_value = df['column'].std()
print(f'Mean: {mean_value}')
print(f'Std Dev: {std_value}')`
    );

    for (const index of [0, 1]) {
      const cell = await page.notebook.getCellLocator(index);
      await cell!.locator('.jp-InputCollapser').click();
    }
    await expect(page.locator('.jp-InputPlaceholder')).toHaveCount(2);

    // A collapsed cell is shorter, so the pointer now hovers another cell
    await page.mouse.move(0, 0);

    const firstCell = await page.notebook.getCellLocator(0);
    const lastCell = await page.notebook.getCellLocator(2);
    const top = (await firstCell!.boundingBox())!;
    const bottom = (await lastCell!.boundingBox())!;
    // The focus ring of the active cell is drawn outside of the cell box
    const margin = 4;

    expect(
      await page.screenshot({
        clip: {
          x: top.x - margin,
          y: top.y - margin,
          width: top.width + 2 * margin,
          height: bottom.y + bottom.height - top.y + 2 * margin
        }
      })
    ).toMatchSnapshot('notebook_cell_folding_first_line.png');
  });
});
