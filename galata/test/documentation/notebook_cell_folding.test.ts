// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Notebook Cell Folding', () => {
  test('Cell folding with first line visible', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}`);

    // Hide the development mode border
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    // Create a new notebook
    await page.notebook.createNew();

    // Add code cells with multi-line content
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

    // Wait for cells to be rendered
    await page.waitForTimeout(300);

    // Collapse the first cell by clicking the collapser button
    const firstCellCollapser = page.locator(
      '.jp-Cell:first-child .jp-InputCollapser'
    );
    await firstCellCollapser.click();

    // Wait for collapse animation
    await page.waitForTimeout(200);

    // Collapse the second cell
    const secondCellCollapser = page.locator(
      '.jp-Cell:nth-child(2) .jp-InputCollapser'
    );
    await secondCellCollapser.click();

    // Wait for collapse animation
    await page.waitForTimeout(200);

    // Take screenshot showing collapsed cells with first line visible
    const notebookPanel = await page.notebook.getNotebookInPanelLocator();
    expect(await notebookPanel!.screenshot()).toMatchSnapshot(
      'notebook_cell_folding_first_line.png'
    );
  });
});


