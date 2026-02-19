import { expect, test } from '@jupyterlab/galata';

const BREADCRUMB_SELECTOR = '.jp-BreadCrumbs';
const SETTING_ID = '@jupyterlab/filebrowser-extension:browser';

test.describe('Adaptive Breadcrumbs Snapshots', () => {
  test('should render correctly with wide sidebar', async ({
    page,
    tmpPath
  }) => {
    // 1. Create directory structure
    const path = '/dir1/dir2/dir3/Longer_dir4/dir5';
    await page.contents.createDirectory(`${tmpPath}/${path}`);

    // Set a wide viewport to accommodate sidebar expansion
    await page.setViewportSize({ width: 1600, height: 720 });

    // Wait for file browser to stabilize
    await page.waitForTimeout(1000);

    // Configure Breadcrumbs Settings
    await page.evaluate(async pluginId => {
      const settingsManager = (window as any).jupyterapp.serviceManager
        .settings;
      const raw = JSON.stringify({
        breadcrumbs: {
          minimumLeftItems: 1,
          minimumRightItems: 2
        }
      });
      await settingsManager.save(pluginId, raw);
    }, SETTING_ID);

    // Wait for settings to apply
    await page.waitForTimeout(1000);

    await page.evaluate(async p => {
      await (window as any).jupyterapp.commands.execute(
        'filebrowser:open-path',
        {
          path: p
        }
      );
    }, `${tmpPath}/${path}`);

    // Wait for breadcrumbs to load
    await page.waitForTimeout(1000);

    // Widen sidebar
    await page.sidebar.setWidth(800);

    // Wait for layout reflow and breadcrumb recalculation
    await page.waitForTimeout(1000);

    // Take snapshot of breadcrumbs container
    const crumbs = page.locator(BREADCRUMB_SELECTOR);
    await expect(crumbs).toHaveScreenshot('breadcrumbs.png');
  });
});
