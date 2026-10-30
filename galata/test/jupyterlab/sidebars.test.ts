// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata } from '@jupyterlab/galata';
import { expect, test } from '@jupyterlab/galata';
import type { ILabShell } from '@jupyterlab/application';
import type { RunningSessions } from '@jupyterlab/running';

import type { Locator } from '@playwright/test';

const sidebarElementIds = {
  'left-sidebar': [
    'filebrowser',
    'jp-running-sessions',
    'table-of-contents',
    'extensionmanager.main-view'
  ],
  'right-sidebar': ['jp-property-inspector', 'jp-debugger-sidebar']
};

const sidebarIds: galata.SidebarTabId[] = sidebarElementIds[
  'left-sidebar'
].concat(sidebarElementIds['right-sidebar']);

type ShowSourcesCase = {
  name: string;
  screenshotSuffix: string;
  showSourcesInMainArea: boolean;
  expectSourcesPanel: boolean;
};

interface ISavedWorkspace {
  data: {
    'layout-restorer:data'?: {
      left?: Pick<ILabShell.ISideArea, 'widgetStates'>;
    };
  };
}
const showSourcesCases: ShowSourcesCase[] = [
  {
    name: 'showSourcesInMainArea = false',
    screenshotSuffix: '-sidebar',
    showSourcesInMainArea: false,
    expectSourcesPanel: true
  },
  {
    name: 'showSourcesInMainArea = true',
    screenshotSuffix: '-main-area',
    showSourcesInMainArea: true,
    expectSourcesPanel: false
  }
];

const DEBUGGER_SIDEBAR_ID = 'jp-debugger-sidebar';

test.use({
  mockState: true
});

/**
 * Add provided text as label on first tab in given tabbar.
 * By default we only have icons, but we should test for the
 * styling of labels which are used downstream (e.g. sidecar).
 */
async function mockLabelOnFirstTab(tabbar: Locator, text: string) {
  await tabbar
    .locator('.lm-TabBar-tabLabel')
    .first()
    .evaluate((node: HTMLElement, text: string) => {
      node.innerText = text;
    }, text);
}

test.describe('Sidebars (except debugger)', () => {
  sidebarIds
    .filter(id => id !== DEBUGGER_SIDEBAR_ID)
    .forEach(sidebarId => {
      test(`Open Sidebar tab ${sidebarId}`, async ({ page }) => {
        await page.sidebar.openTab(sidebarId);
        expect(await page.sidebar.isTabOpen(sidebarId)).toBe(true);

        const position = await page.sidebar.getTabPosition(sidebarId);
        const sidebar = page.sidebar.getContentPanelLocator(
          position ?? undefined
        );

        const imageName = `opened-sidebar-${sidebarId.replace('.', '-')}.png`;

        expect(await sidebar.screenshot()).toMatchSnapshot(imageName);
      });
    });
});

test.describe('Section reordering', () => {
  const TOGGLE_REORDERING_SELECTOR =
    '[data-command="apputils:toggle-section-reordering"]';

  async function toggleReordering(
    page: galata.IJupyterLabPageFixture,
    title: Locator
  ): Promise<void> {
    await title
      .locator('.lm-AccordionPanel-titleLabel')
      .click({ button: 'right' });
    await page.locator(TOGGLE_REORDERING_SELECTOR).click();
  }

  async function startDrag(
    page: galata.IJupyterLabPageFixture,
    title: Locator,
    target: Locator
  ): Promise<number> {
    const handle = await title
      .locator('.jp-AccordionPanel-dragHandle')
      .boundingBox();
    const destination = await target.boundingBox();
    if (!handle || !destination) {
      throw new Error('Section headers are not visible');
    }
    await title.evaluate(node => {
      node.addEventListener(
        'pointerdown',
        event => {
          if (event instanceof PointerEvent) {
            node.setAttribute('data-pointer-id', String(event.pointerId));
          }
        },
        { once: true }
      );
    });
    await page.mouse.move(
      handle.x + handle.width / 2,
      handle.y + handle.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      destination.x + destination.width / 2,
      destination.y + destination.height - 1,
      { steps: 5 }
    );
    const pointerId = await title.getAttribute('data-pointer-id');
    await title.evaluate(node => node.removeAttribute('data-pointer-id'));
    if (pointerId === null) {
      throw new Error('The section did not receive a pointer event');
    }
    return Number(pointerId);
  }

  test('should unlock, reorder and lock sections from the context menu', async ({
    page
  }) => {
    await page.sidebar.openTab('jp-running-sessions');
    const panel = page.locator('#jp-running-sessions .jp-SidePanel-content');
    const titles = panel.locator('.lm-AccordionPanel-title');
    const labels = titles.locator('.lm-AccordionPanel-titleLabel');
    const initialLabels = await labels.allTextContents();
    const expanded = await titles.first().getAttribute('aria-expanded');
    await expect(
      titles.first().locator('.jp-AccordionPanel-dragHandle')
    ).toBeHidden();

    await toggleReordering(page, titles.first());
    await expect(
      titles.first().locator('.jp-AccordionPanel-dragHandle')
    ).toBeVisible();
    await startDrag(page, titles.first(), titles.nth(1));
    await page.mouse.up();
    await expect(labels.nth(0)).toHaveText(initialLabels[1]);
    await expect(labels.nth(1)).toHaveText(initialLabels[0]);
    await expect
      .poll(() => titles.nth(1).getAttribute('aria-expanded'))
      .toBe(expanded);

    await titles.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(titles.nth(1)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(titles.nth(2)).toBeFocused();

    await toggleReordering(page, titles.first());
    await expect(
      titles.first().locator('.jp-AccordionPanel-dragHandle')
    ).toBeHidden();
  });

  test('should share the reordering lock between sidebar panels', async ({
    page
  }) => {
    await page.sidebar.openTab('jp-running-sessions');
    await page.sidebar.openTab('jp-debugger-sidebar');
    const runningTitle = page
      .locator('#jp-running-sessions .lm-AccordionPanel-title')
      .first();
    const debuggerTitle = page
      .locator('#jp-debugger-sidebar .lm-AccordionPanel-title')
      .first();
    const runningHandle = runningTitle.locator('.jp-AccordionPanel-dragHandle');
    const debuggerHandle = debuggerTitle.locator(
      '.jp-AccordionPanel-dragHandle'
    );
    await expect(runningHandle).toBeHidden();
    await expect(debuggerHandle).toBeHidden();

    await toggleReordering(page, runningTitle);
    await expect(runningHandle).toBeVisible();
    await expect(debuggerHandle).toBeVisible();
    await debuggerTitle
      .locator('.lm-AccordionPanel-titleLabel')
      .click({ button: 'right' });
    const toggle = page.locator(TOGGLE_REORDERING_SELECTOR);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(runningHandle).toBeHidden();
    await expect(debuggerHandle).toBeHidden();

    for (const unlocked of [false, true]) {
      if (unlocked) {
        await toggleReordering(page, debuggerTitle);
        await expect(runningHandle).toBeVisible();
      }
      await runningTitle.locator('.lm-AccordionPanel-titleLabel').click();
      await expect(runningTitle).toHaveAttribute('aria-expanded', 'false');
      await runningTitle.locator('.lm-AccordionPanel-titleLabel').click();
      await expect(runningTitle).toHaveAttribute('aria-expanded', 'true');
    }
  });

  test('should restore reordered section states after reload', async ({
    page
  }) => {
    await page.sidebar.openTab('jp-running-sessions');
    const panel = page.locator('#jp-running-sessions .jp-SidePanel-content');
    const titles = panel.locator('.lm-AccordionPanel-title');
    const labels = titles.locator('.lm-AccordionPanel-titleLabel');
    await expect(labels).toContainText(['Open Tabs', 'Kernels']);
    const initialLabels = await labels.allTextContents();
    for (const title of await titles.all()) {
      if ((await title.getAttribute('aria-expanded')) === 'false') {
        await title.locator('.lm-AccordionPanel-titleLabel').click();
      }
    }
    await toggleReordering(page, titles.first());
    await startDrag(page, titles.first(), titles.nth(1));
    await page.mouse.up();
    const reordered = [
      initialLabels[1],
      initialLabels[0],
      ...initialLabels.slice(2)
    ];
    await expect(labels).toHaveText(reordered);

    await Promise.all([
      page.waitForResponse(response => {
        if (
          response.request().method() !== 'PUT' ||
          !galata.Routes.workspaces.test(response.url())
        ) {
          return false;
        }
        const workspace = response.request().postDataJSON() as ISavedWorkspace;
        return (
          workspace.data['layout-restorer:data']?.left?.widgetStates[
            'jp-running-sessions'
          ]?.expansionStates?.[0] === false
        );
      }),
      titles.first().locator('.lm-AccordionPanel-titleLabel').click()
    ]);
    await page.reload();
    await page.sidebar.openTab('jp-running-sessions');
    await expect(labels).toHaveText(reordered);
    await expect(titles.first()).toHaveAttribute('aria-expanded', 'false');
    await expect(titles.nth(1)).toHaveAttribute('aria-expanded', 'true');
  });

  test('should cancel dragging with Escape when focus is outside the accordion', async ({
    page
  }) => {
    await page.sidebar.openTab('jp-running-sessions');
    const panel = page.locator('#jp-running-sessions .jp-SidePanel-content');
    const titles = panel.locator('.lm-AccordionPanel-title');
    const labels = titles.locator('.lm-AccordionPanel-titleLabel');
    const initialLabels = await labels.allTextContents();
    await toggleReordering(page, titles.first());
    await page.getByRole('menuitem', { name: 'File', exact: true }).focus();
    await startDrag(page, titles.first(), titles.nth(1));
    await expect(panel).toHaveClass(/jp-mod-dragging/);
    await page.keyboard.press('Escape');
    await expect(panel).not.toHaveClass(/jp-mod-dragging/);
    await page.mouse.up();
    await expect(labels).toHaveText(initialLabels);
    await expect(
      panel.locator('.jp-AccordionPanel-dropIndicator')
    ).toBeHidden();
  });

  for (const eventType of ['pointercancel', 'lostpointercapture']) {
    test(`should cancel dragging on ${eventType}`, async ({ page }) => {
      await page.sidebar.openTab('jp-running-sessions');
      const panel = page.locator('#jp-running-sessions .jp-SidePanel-content');
      const titles = panel.locator('.lm-AccordionPanel-title');
      const labels = titles.locator('.lm-AccordionPanel-titleLabel');
      const initialLabels = await labels.allTextContents();
      await toggleReordering(page, titles.first());
      const pointerId = await startDrag(page, titles.first(), titles.nth(1));
      if (eventType === 'pointercancel') {
        await panel.dispatchEvent(eventType, { pointerId });
      } else {
        await panel.evaluate(
          (node, id) => node.releasePointerCapture(id),
          pointerId
        );
        await page.mouse.move(0, 0);
      }
      await expect(panel).not.toHaveClass(/jp-mod-dragging/);
      await page.mouse.up();
      await expect(labels).toHaveText(initialLabels);
      await expect(
        panel.locator('.jp-AccordionPanel-dropIndicator')
      ).toBeHidden();
    });
  }

  test('should ignore another pointer while dragging a section', async ({
    page
  }) => {
    await page.sidebar.openTab('jp-running-sessions');
    const panel = page.locator('#jp-running-sessions .jp-SidePanel-content');
    const titles = panel.locator('.lm-AccordionPanel-title');
    const labels = titles.locator('.lm-AccordionPanel-titleLabel');
    const initialLabels = await labels.allTextContents();
    await toggleReordering(page, titles.first());
    const pointerId = await startDrag(page, titles.first(), titles.nth(1));
    await titles
      .nth(1)
      .locator('.jp-AccordionPanel-dragHandle')
      .dispatchEvent('pointerdown', {
        pointerId: pointerId + 1,
        pointerType: 'touch',
        button: 0
      });
    await page.mouse.up();
    await expect(labels).toHaveText([
      initialLabels[1],
      initialLabels[0],
      ...initialLabels.slice(2)
    ]);
    await expect(panel).not.toHaveClass(/jp-mod-dragging/);
  });

  test('should handle sections added to an unlocked file browser and recreated accordions', async ({
    page
  }) => {
    const runningTitles = page.locator(
      '#jp-running-sessions .lm-AccordionPanel-title'
    );
    const accordion = page.locator('.jp-FileBrowser-accordion');
    const titles = accordion.locator('.lm-AccordionPanel-title');

    const moveToFileBrowser = async (name: string): Promise<void> => {
      await page.sidebar.openTab('jp-running-sessions');
      await runningTitles.filter({ hasText: name }).click({ button: 'right' });
      await page
        .locator('[data-command="apputils:move-section-to"]')
        .filter({ hasText: 'File Browser' })
        .click();
      await page.sidebar.openTab('filebrowser');
    };
    await page.sidebar.openTab('jp-running-sessions');
    await toggleReordering(page, runningTitles.first());
    await moveToFileBrowser('Open Tabs');
    await expect(titles).toHaveCount(2);
    await expect(
      titles.first().locator('.jp-AccordionPanel-dragHandle')
    ).toBeVisible();
    await moveToFileBrowser('Terminals');
    await expect(titles).toHaveCount(3);
    await expect(
      accordion.locator('.jp-AccordionPanel-dragHandle')
    ).toHaveCount(3);
    await expect(
      accordion.locator('.jp-AccordionPanel-dragHandle:visible')
    ).toHaveCount(3);

    for (const name of ['Open Tabs', 'Terminals']) {
      await titles.filter({ hasText: name }).click({ button: 'right' });
      await page.locator('[data-command="apputils:move-section-back"]').click();
    }
    await expect(accordion).toHaveCount(0);

    await moveToFileBrowser('Open Tabs');
    await expect(titles).toHaveCount(2);
    await expect(
      titles.first().locator('.jp-AccordionPanel-dragHandle')
    ).toBeVisible();
    const labels = titles.locator('.lm-AccordionPanel-titleLabel');
    const initialLabels = await labels.allTextContents();
    await startDrag(page, titles.first(), titles.nth(1));
    await page.mouse.up();
    await expect(labels).toHaveText([initialLabels[1], initialLabels[0]]);
  });

  test('should retain the search section handle when its title changes', async ({
    page
  }) => {
    await page.route(galata.Routes.extensions, route =>
      route.fulfill({ json: [] })
    );
    await page.sidebar.openTab('extensionmanager.main-view');
    const panel = page.locator('.jp-extensionmanager-view');
    await toggleReordering(
      page,
      panel.locator('.lm-AccordionPanel-title').first()
    );
    await panel.locator('.jp-extensionmanager-disclaimer-enable').click();
    await panel.getByRole('searchbox').fill('jupyter');
    const search = panel
      .locator('.lm-AccordionPanel-title')
      .filter({ hasText: 'Search Results' });
    await expect(search.locator('.jp-AccordionPanel-dragHandle')).toHaveCount(
      1
    );
    await expect(search.locator('.jp-AccordionPanel-dragHandle')).toBeVisible();
    await panel.getByRole('searchbox').clear();
    const discover = panel
      .locator('.lm-AccordionPanel-title')
      .filter({ hasText: 'Discover' });
    await expect(discover.locator('.jp-AccordionPanel-dragHandle')).toHaveCount(
      1
    );
    await expect(
      discover.locator('.jp-AccordionPanel-dragHandle')
    ).toBeVisible();
  });

  test('should acknowledge the warning after its section is reordered', async ({
    page
  }) => {
    await page.route(galata.Routes.extensions, route =>
      route.fulfill({ json: [] })
    );
    await page.sidebar.openTab('extensionmanager.main-view');
    const panel = page.locator('.jp-extensionmanager-view');
    const titles = panel.locator('.lm-AccordionPanel-title');
    const warning = titles.filter({ hasText: 'Warning' });
    const installed = titles.filter({ hasText: 'Installed' });
    await toggleReordering(page, warning);
    await startDrag(page, warning, installed);
    await page.mouse.up();
    await expect(titles.first()).toContainText('Installed');
    await panel.locator('.jp-extensionmanager-disclaimer-enable').click();
    await expect(warning).toHaveAttribute('aria-expanded', 'false');
    await expect(installed).toHaveAttribute('aria-expanded', 'true');
    await expect(titles.filter({ hasText: 'Discover' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});

test.describe('Debugger sidebar', () => {
  for (const c of showSourcesCases) {
    test.describe(c.name, () => {
      test.use({
        mockSettings: {
          ...galata.DEFAULT_SETTINGS,
          '@jupyterlab/debugger-extension:main': {
            showSourcesInMainArea: c.showSourcesInMainArea
          }
        }
      });

      test(`Open Sidebar tab jp-debugger-sidebar`, async ({ page }) => {
        await page.sidebar.openTab(DEBUGGER_SIDEBAR_ID);
        expect(await page.sidebar.isTabOpen(DEBUGGER_SIDEBAR_ID)).toBe(true);

        const position = await page.sidebar.getTabPosition(DEBUGGER_SIDEBAR_ID);
        const sidebar = page.sidebar.getContentPanelLocator(
          position ?? undefined
        );

        const imageName =
          `opened-sidebar-${DEBUGGER_SIDEBAR_ID.replace('.', '-')}` +
          `${c.screenshotSuffix}.png`;

        expect(await sidebar.screenshot()).toMatchSnapshot(imageName);
      });
    });
  }
});

test('File Browser has no unused rules', async ({ page }) => {
  await page.sidebar.openTab('filebrowser');
  const clickMenuItem = async (command): Promise<void> => {
    const contextmenu = await page.menu.openContextMenuLocator(
      '.jp-DirListing-headerItem'
    );
    const item = await page.menu.getMenuItemLocatorInMenu(contextmenu, command);
    await item?.click();
  };
  await clickMenuItem('Show File Checkboxes');
  await clickMenuItem('Show File Size Column');
  await clickMenuItem('Show Date Created Column');

  await page.notebook.createNew('notebook.ipynb');

  const unusedRules = await page.style.findUnusedStyleRules({
    fragments: ['jp-DirListing', 'jp-FileBrowser'],
    exclude: [
      // active during renaming
      'jp-DirListing-editor',
      // hidden files
      '[data-is-dot]',
      // filtering results
      '.jp-DirListing-content mark',
      // only added after resizing
      'jp-DirListing-narrow',
      // used in "open file" dialog containing a file browser
      '.jp-Open-Dialog',
      // used for movable sections in file browser, not visible
      // when no sections are moved
      'jp-FileBrowser-accordion'
    ]
  });
  expect(unusedRules.length).toEqual(0);
});

test('Left light tabbar (with text)', async ({ page }) => {
  await page.theme.setLightTheme();
  const imageName = 'left-light-tabbar-with-text.png';
  const tabbar = page.sidebar.getTabBarLocator();
  await mockLabelOnFirstTab(tabbar, 'File Browser');
  expect(await tabbar.screenshot()).toMatchSnapshot(imageName.toLowerCase());
});

test('Right dark tabbar (with text)', async ({ page }) => {
  await page.theme.setDarkTheme();
  const imageName = 'right-dark-tabbar-with-text.png';
  const tabbar = page.sidebar.getTabBarLocator('right');
  await mockLabelOnFirstTab(tabbar, 'Property Inspector');
  expect(await tabbar.screenshot()).toMatchSnapshot(imageName.toLowerCase());
});

test('Move File Browser to right', async ({ page }) => {
  await page.sidebar.moveTabToRight('filebrowser');
  expect(await page.sidebar.getTabPosition('filebrowser')).toBe('right');
});

test('Open File Browser on right', async ({ page }) => {
  await page.sidebar.moveTabToRight('filebrowser');
  await page.sidebar.openTab('filebrowser');
  expect(await page.sidebar.isTabOpen('filebrowser')).toEqual(true);
});

test('Open Sidebar on right', async ({ page }) => {
  await page.sidebar.open('right');
  expect(await page.sidebar.isOpen('right')).toEqual(true);
});

test('Close Sidebar on right', async ({ page }) => {
  await page.sidebar.open('right');
  await page.menu.clickMenuItem('View>Appearance>Show Right Sidebar');
  expect(await page.sidebar.isOpen('right')).toEqual(false);
});

test('Capture File Browser on right', async ({ page }) => {
  await page.sidebar.moveTabToRight('filebrowser');
  await page.sidebar.openTab('filebrowser');

  let imageName = 'filebrowser-right.png';
  expect(await page.screenshot()).toMatchSnapshot(imageName);
});

test('Move Debugger to left', async ({ page }) => {
  await page.sidebar.moveTabToLeft('jp-debugger-sidebar');
  expect(await page.sidebar.getTabPosition('jp-debugger-sidebar')).toEqual(
    'left'
  );
});

test('Check Running Session button on sidebar has correct aria label and role', async ({
  page
}) => {
  await page.sidebar.open('left');
  const runningSessionsWidget = page.locator('#jp-running-sessions');
  await expect(runningSessionsWidget).toHaveAttribute(
    'aria-label',
    'Running Sessions section'
  );
  await expect(runningSessionsWidget).toHaveAttribute('role', 'region');
});

test('Running sessions includes terminals discovered while detached', async ({
  page
}) => {
  await page.sidebar.openTab('jp-running-sessions');
  const labels = page
    .getByRole('region', { name: 'Terminals Section', exact: true })
    .locator('.jp-RunningSessions-itemLabel');
  await expect(labels).toHaveCount(0);

  await page.evaluate(async () => {
    const app = window.jupyterapp;
    const sidebar = Array.from(app.shell.widgets('left')).find(
      (widget): widget is RunningSessions => widget.id === 'jp-running-sessions'
    );
    const section = sidebar?.removeSectionById('Terminals');
    if (!sidebar || !section) {
      throw new Error('Terminals section is missing');
    }
    try {
      await app.serviceManager.terminals.startNew();
    } finally {
      sidebar.reinsertSection(section);
    }
  });

  await expect(labels).toHaveCount(1);
});

test('Check Extension Manager button on sidebar has correct aria label and role', async ({
  page
}) => {
  await page.sidebar.open('left');
  const extensionManagerWidget = page.locator('#extensionmanager\\.main-view');
  await expect(extensionManagerWidget).toHaveAttribute(
    'aria-label',
    'Extension Manager section'
  );
  await expect(extensionManagerWidget).toHaveAttribute('role', 'region');
});

test('Check File Browser button on sidebar has correct aria label and role', async ({
  page
}) => {
  await page.sidebar.open('left');
  const fileBrowserWidget = page.locator('#filebrowser');
  await expect(fileBrowserWidget).toHaveAttribute(
    'aria-label',
    'File Browser Section'
  );
  await expect(fileBrowserWidget).toHaveAttribute('role', 'region');
});

test('Check Debugger button on sidebar has correct aria label and role', async ({
  page
}) => {
  await page.sidebar.open('right');
  const debuggerWidget = page.locator('#jp-debugger-sidebar');
  await expect(debuggerWidget).toHaveAttribute(
    'aria-label',
    'Debugger section'
  );
  await expect(debuggerWidget).toHaveAttribute('role', 'region');
});

test('Check Table of Contents button on sidebar has correct aria label and role', async ({
  page
}) => {
  await page.sidebar.open('left');
  const tableOfContentsWidget = page.locator('#table-of-contents');
  await expect(tableOfContentsWidget).toHaveAttribute(
    'aria-label',
    'Table of Contents section'
  );
  await expect(tableOfContentsWidget).toHaveAttribute('role', 'region');
});

const elementAriaLabels = {
  'jp-running-sessions': [
    'Open Tabs Section',
    'Kernels Section',
    'Language servers Section',
    'Recently Closed Section',
    'Workspaces Section',
    'Terminals Section'
  ],
  'jp-debugger-sidebar': [
    'Variables Section',
    'Callstack Section',
    'Breakpoints Section',
    'Source Section',
    'Kernel Sources Section'
  ],
  'extensionmanager.main-view': [
    'Warning Section',
    'Installed Section',
    'Discover Section'
  ]
};

test.describe('Sidebar keyboard navigation @a11y', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/debugger-extension:main': {
        showSourcesInMainArea: false
      }
    }
  });
  test.skip(
    ({ browserName }) => browserName === 'firefox',
    'Some cases fail on Firefox'
  );

  Object.keys(sidebarElementIds).forEach(sideBar => {
    test(`Open ${sideBar} via keyboard navigation`, async ({ page }) => {
      const keyValueArray: string[] = sidebarElementIds[sideBar];

      for (let dataId of keyValueArray) {
        await page.goto();
        await page.sidebar.close('right');
        await page.sidebar.close('left');
        await page.activity.keyToElement(
          `[data-id='${keyValueArray[0]}']`,
          'Tab'
        );

        await page.activity.keyToElement(`[data-id='${dataId}']`, 'ArrowDown');

        await page.keyboard.press('Enter');

        expect(await page.sidebar.isTabOpen(dataId)).toEqual(true);
      }
    });
  });

  Object.keys(elementAriaLabels).forEach(tabName => {
    test(`Open accordion panels ${tabName} via keyboard navigation`, async ({
      page
    }) => {
      await page.sidebar.openTab(tabName);

      const keyValueArray: string[] = elementAriaLabels[tabName];

      for (let ariaLabel of keyValueArray) {
        const elementLocator = page.locator(`[aria-label='${ariaLabel}']`);
        const initialState = await elementLocator.getAttribute('aria-expanded');

        await page.activity.keyToElement(`[aria-label='${ariaLabel}']`, 'Tab');
        await page.keyboard.press('Enter');
        // Pressing Enter toggles the panel; wait for aria-expanded to flip.
        await expect
          .poll(() => elementLocator.getAttribute('aria-expanded'))
          .not.toBe(initialState);

        await page.keyboard.press('Enter');
        // Toggling again returns the panel to its initial state.
        await expect
          .poll(() => elementLocator.getAttribute('aria-expanded'))
          .toBe(initialState);
      }
    });
  });
});

test.describe('Running Sessions - Move Sections to File Browser', () => {
  const RUNNING_SECTION_TITLE_SELECTOR =
    '#jp-running-sessions .jp-AccordionPanel-title';
  const HOSTED_SECTION_TITLE_SELECTOR =
    '.jp-FileBrowser-accordion .jp-hosted-section';
  const MOVE_TO_FB_COMMAND_SELECTOR =
    '.lm-Menu-content .lm-Menu-item[data-command="apputils:move-section-to"]';
  const MOVE_BACK_COMMAND_SELECTOR =
    '.lm-Menu-content .lm-Menu-item[data-command="apputils:move-section-back"]';

  test.use({
    tmpPath: 'running-sessions-filebrowser-test'
  });

  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.uploadContent('hello', 'text', `${tmpPath}/test.txt`);
  });

  test.beforeEach(async ({ page, tmpPath }) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.filebrowser.openDirectory(tmpPath);
  });

  test('should move sections to file browser, take screenshot, and move back via context menu', async ({
    page
  }) => {
    // Open a .txt file and a terminal so Open Tabs has entries
    await page.filebrowser.open('test.txt');
    await page.menu.clickMenuItem('File>New>Terminal');

    // Move "Open Tabs" to the file browser
    await page.sidebar.openTab('jp-running-sessions');
    const openTabsRunningTitle = page
      .locator(RUNNING_SECTION_TITLE_SELECTOR)
      .filter({ hasText: 'Open Tabs' });
    await openTabsRunningTitle.click({ button: 'right' });
    await page
      .locator(MOVE_TO_FB_COMMAND_SELECTOR)
      .filter({ hasText: 'File Browser' })
      .click();

    // Move "Terminals" to the file browser
    const terminalsRunningTitle = page
      .locator(RUNNING_SECTION_TITLE_SELECTOR)
      .filter({ hasText: 'Terminals' });
    await terminalsRunningTitle.click({ button: 'right' });
    await page
      .locator(MOVE_TO_FB_COMMAND_SELECTOR)
      .filter({ hasText: 'File Browser' })
      .click();

    // Switch to the file browser and verify both sections are hosted there
    await page.sidebar.openTab('filebrowser');
    const openTabsHostedTitle = page
      .locator(HOSTED_SECTION_TITLE_SELECTOR)
      .filter({ hasText: 'Open Tabs' });
    const terminalsHostedTitle = page
      .locator(HOSTED_SECTION_TITLE_SELECTOR)
      .filter({ hasText: 'Terminals' });
    await expect(openTabsHostedTitle).toBeVisible();
    await expect(terminalsHostedTitle).toBeVisible();

    // Keep this layout snapshot focused on hosted section placement. Terminal
    // labels are covered in terminal tests and can vary with terminal titles.
    const hostedTerminalLabels = page
      .locator('.jp-FileBrowser-accordion .jp-RunningSessions-section')
      .nth(1)
      .locator('.jp-RunningSessions-itemLabel');
    await expect(hostedTerminalLabels.first()).toBeVisible();
    await hostedTerminalLabels.first().evaluate(node => {
      node.textContent = 'terminals/1';
    });

    // Screenshot with both sections visible in the file browser accordion
    const leftPanel = page.sidebar.getContentPanelLocator('left');
    expect(await leftPanel.screenshot()).toMatchSnapshot(
      'filebrowser-with-moved-sections.png'
    );

    // Move "Open Tabs" back via context menu
    await openTabsHostedTitle.click({ button: 'right' });
    await page
      .locator(MOVE_BACK_COMMAND_SELECTOR)
      .filter({ hasText: 'Running Sessions' })
      .click();
    await expect(openTabsHostedTitle).not.toBeVisible();

    // Move "Terminals" back via context menu
    await terminalsHostedTitle.click({ button: 'right' });
    await page
      .locator(MOVE_BACK_COMMAND_SELECTOR)
      .filter({ hasText: 'Running Sessions' })
      .click();
    await expect(terminalsHostedTitle).not.toBeVisible();

    // Both sections should be back in running sessions
    await page.sidebar.openTab('jp-running-sessions');
    await expect(openTabsRunningTitle).toBeVisible();
    await expect(terminalsRunningTitle).toBeVisible();
  });
});
