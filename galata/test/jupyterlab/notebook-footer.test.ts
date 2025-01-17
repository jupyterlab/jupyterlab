/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { test, expect } from '@playwright/test';

const breakpoints = [759, 600, 500, 400];

test.describe('Notebook footer responsiveness', () => {
    for (const width of breakpoints) {
        test(`Footer layout for viewport width ${width}px`, async ({ page }) => {
            // Dynamically set the viewport for the test
            await page.setViewportSize({ width, height: 800 });

            // Go to the JupyterLab login page
            await page.goto('http://127.0.0.1:8888/login?next=%2Flab%2Fworkspaces%2Fauto-L%2Ftree%2FUntitled3.ipynb');

            // Login with the token
            await page.getByLabel('Password or token:').click();
            await page.getByLabel('Password or token:').fill('df3ae5e770971bd20578df895ae0d727cdaa765c79591730');
            await page.getByRole('button', { name: 'Log in', exact: true }).click();

            // Navigate to the notebook page
            await page.goto('http://127.0.0.1:8888/lab/workspaces/auto-L/tree/Untitled3.ipynb');

            // Wait for the footer element to be available
            const footer = page.locator('.jp-Notebook-footer');
            await footer.waitFor();

            // Take a screenshot of the footer for this width
            const screenshotPath = `footer-responsive-${width}px.png`;
            await footer.screenshot({ path: screenshotPath });

            // Optionally, verify the screenshot against a baseline
            await expect(footer).toHaveScreenshot(screenshotPath);
        });
    }
});
