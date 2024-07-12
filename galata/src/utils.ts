// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';
import { ElementHandle, Locator, Page } from '@playwright/test';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Read a file as a base-64 string
 *
 * @param filePath Local file path
 * @returns Base 64 encoded file content
 */
export function base64EncodeFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return content.toString('base64');
}

/**
 * Private page config data for the Jupyter application.
 */
let configData: { [key: string]: string } | null = null;

// Get config data
async function getConfigData(page: Page): Promise<{ [key: string]: string }> {
  if (configData) {
    return configData;
  }

  configData = Object.create(null);

  const el = await page.$('#jupyter-config-data');

  if (!el) {
    return {};
  }

  configData = JSON.parse((await el?.textContent()) ?? '{}');

  for (const key in configData) {
    // PageConfig expects strings
    if (typeof configData[key] !== 'string') {
      configData[key] = JSON.stringify(configData[key]);
    }
  }

  return configData!;
}

/**
 * Get a url-encoded item from `body.data` and decode it
 * We should never have any encoded URLs anywhere else in code
 * until we are building an actual request.
 */
async function getBodyData(page: Page, key: string): Promise<string> {
  const val = await page.evaluate(key => document.body.dataset[key], key);
  if (typeof val === 'undefined') {
    return '';
  }
  return decodeURIComponent(val);
}

/**
 * Get the Jupyter server base URL stored in the index.html file
 *
 * @param page Playwright page model
 * @returns Base URL
 */
export async function getBaseUrl(page: Page): Promise<string> {
  return URLExt.normalize((await getOption(page, 'baseUrl')) || '/');
}

/**
 * Get the classes of an element
 *
 * @param element Element handle
 * @returns Classes list
 *
 * @deprecated You should use locator instead {@link getLocatorClassList}
 */
export async function getElementClassList(
  element: ElementHandle
): Promise<string[]> {
  if (!element) {
    return [];
  }

  const className = await element.getProperty('className');
  if (className) {
    const classNameList = await className.jsonValue();
    if (typeof classNameList === 'string') {
      return classNameList.split(' ');
    }
  }

  return [];
}

/**
 * Get the classes of an locator
 *
 * @param locator Element locator
 * @returns Classes list
 */
export async function getLocatorClassList(locator: Locator): Promise<string[]> {
  const className = await locator.getAttribute('class');
  if (className) {
    return className.split(/\s/);
  }

  return [];
}

/**
 * List the content of a local directory
 *
 * @param dirPath Local directory path
 * @param filePaths List to populate with the directory content
 * @returns Content of the directory
 */
export function getFilesInDirectory(
  dirPath: string,
  filePaths?: string[]
): string[] {
  const files = fs.readdirSync(dirPath);

  filePaths = filePaths || [];

  for (const file of files) {
    if (file.startsWith('.')) {
      continue;
    }
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      filePaths = getFilesInDirectory(dirPath + '/' + file, filePaths);
    } else {
      filePaths.push(path.join(dirPath, '/', file));
    }
  }

  return filePaths;
}

/**
 * Get the value of an option stored in the page config object
 *
 * @param page Playwright page model
 * @param name Option name
 * @returns Option value
 */
export async function getOption(page: Page, name: string): Promise<string> {
  return (await getConfigData(page))[name] ?? (await getBodyData(page, name));
}

/**
 * Get the token stored in the page config object
 *
 * @param page Playwright page model
 * @returns Token
 */
export async function getToken(page: Page): Promise<string> {
  return (
    (await getOption(page, 'token')) ||
    (await getBodyData(page, 'jupyterApiToken'))
  );
}

/**
 * Wait for a function to return true until timeout
 *
 * @param fn Condition
 * @param timeout Time out
 */
export async function waitForCondition(
  fn: () => boolean | Promise<boolean>,
  timeout?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    let checkTimer: NodeJS.Timeout | null = null;
    let timeoutTimer: NodeJS.Timeout | null = null;
    const check = async () => {
      checkTimer = null;
      if (await Promise.resolve(fn())) {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
        }
        resolve();
      } else {
        checkTimer = setTimeout(check, 50);
      }
    };

    void check();

    if (timeout) {
      timeoutTimer = setTimeout(() => {
        timeoutTimer = null;
        if (checkTimer) {
          clearTimeout(checkTimer);
        }
        reject(new Error('Timed out waiting for condition to be fulfilled.'));
      }, timeout);
    }
  });
}

/**
 * Wait for an element to emit 'transitionend' event.
 *
 * @param page Playwright page model object
 * @param element Element or selector to watch
 */
export async function waitForTransition(
  page: Page,
  element: ElementHandle<Element> | Locator | string
): Promise<void> {
  let el = typeof element === 'string' ? page.locator(element) : element;
  try {
    return (el as Locator).evaluate(elem => {
      return new Promise(resolve => {
        const onEndHandler = () => {
          elem.removeEventListener('transitionend', onEndHandler);
          resolve();
        };
        elem.addEventListener('transitionend', onEndHandler);
      });
    });
  } catch {
    if (el) {
      console.warn(
        'ElementHandle are deprecated, you should call "WaitForTransition()" \
        with a Locator instead'
      );
      return page.evaluate(el => {
        return new Promise(resolve => {
          const onEndHandler = () => {
            el.removeEventListener('transitionend', onEndHandler);
            resolve();
          };
          el.addEventListener('transitionend', onEndHandler);
        });
      }, el as ElementHandle<Element>);
    }
    return Promise.reject();
  }
}

// Selector builders

/**
 * Get the selector to look for a specific class
 *
 * @param className Class name
 * @returns Selector
 *
 * @deprecated You should use locator CSS selector `locator('.className')`
 */
export function xpContainsClass(className: string): string {
  return `contains(concat(" ", normalize-space(@class), " "), " ${className} ")`;
}

/**
 * Get the selector to look for a specific activity tab
 *
 * @param name Activity name
 * @returns Selector
 *
 * @deprecated You should use locator selector `getByRole('main').getByRole('tab', { name })`
 */
export function xpBuildActivityTabSelector(name: string): string {
  return `//div[contains(@role, "main")]//ul/li[${xpContainsClass(
    'lm-TabBar-tab'
  )} and ./div[text()="${name}" and ${xpContainsClass('lm-TabBar-tabLabel')}]]`;
}

/**
 * Get the selector to look for a specific activity panel
 *
 * @param id Activity id
 * @returns Selector
 *
 * @deprecated You should use locator selector `getByRole('main').getByRole('tabpanel', { name })`
 *   where `name` is the name of the tab.
 */
export function xpBuildActivityPanelSelector(id: string): string {
  return `//div[@id='${id}' and ${xpContainsClass(
    'jp-Activity'
  )} and ${xpContainsClass('lm-DockPanel-widget')}]`;
}

/**
 * Get the selector to look for the currently active activity tab
 *
 * @returns Selector
 *
 * @deprecated You should use locator selector `getByRole('main').locator('.jp-mod-current[role="tab"]')`
 */
export function xpBuildActiveActivityTabSelector(): string {
  return `//div[contains(@role, "main")]//ul/li[${xpContainsClass(
    'lm-TabBar-tab'
  )} and ${xpContainsClass('jp-mod-current')} and ./div[${xpContainsClass(
    'lm-TabBar-tabLabel'
  )}]]`;
}

/**
 * Whether JupyterLab is in simple mode or not
 */
export function isInSimpleMode(page: Page): Promise<boolean> {
  const toggle = page.getByRole('switch', { name: 'Simple' });
  return toggle.isChecked();
}
