// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Page } from '@playwright/test';
import * as path from 'path';
import { ContentsHelper } from '../contents';
import * as Utils from '../utils';

/**
 * File Browser Helpers
 */
export class FileBrowserHelper {
  constructor(readonly page: Page, readonly contents: ContentsHelper) {}

  /**
   * Create the selector for a file in the file browser
   *
   * @param fileName File name
   * @returns XPath to file in file browser
   */
  xpBuildFileSelector(fileName: string): string {
    return `//div[@id='filebrowser']//li[./span[${Utils.xpContainsClass(
      'jp-DirListing-itemText'
    )} and ./span[text()="${fileName}"]]]`;
  }

  /**
   * Create the selector for a directory in the file browser
   *
   * @param dirName Directory name
   * @returns XPath to directory in file browser
   */
  xpBuildDirectorySelector(dirName: string): string {
    return `//div[@id='filebrowser']//li[@data-isdir='true' and ./span[${Utils.xpContainsClass(
      'jp-DirListing-itemText'
    )} and ./span[text()="${dirName}"]]]`;
  }

  /**
   * Reveal a file in the file browser.
   *
   * It will open intermediate folders if needed.
   *
   * @param filePath File path
   */
  async revealFileInBrowser(filePath: string): Promise<void> {
    const pos = filePath.lastIndexOf('/');
    const fileName = path.basename(filePath);
    if (pos >= 0) {
      const dirPath = filePath.substring(0, pos);
      await this.openDirectory(dirPath);
    }

    await Utils.waitForCondition(async () => {
      return await this.isFileListedInBrowser(fileName);
    });
  }

  /**
   * Whether the file is listed in the file browser or not.
   *
   * @param fileName File name
   * @returns File status
   */
  async isFileListedInBrowser(fileName: string): Promise<boolean> {
    const item = await this.page.$(
      `xpath=${this.xpBuildFileSelector(fileName)}`
    );
    return item !== null;
  }

  /**
   * Get the full path of the currently opened directory
   *
   * @returns Directory full path
   */
  async getCurrentDirectory(): Promise<string> {
    return await this.page.evaluate(() => {
      let directory = '';
      const spans = document.querySelectorAll(
        '.jp-FileBrowser .jp-FileBrowser-crumbs span'
      );
      const numSpans = spans.length;
      if (numSpans > 1) {
        directory = spans[numSpans - 2].getAttribute('title') ?? '';
      }

      return directory;
    });
  }

  /**
   * Open a file
   *
   * Note: This will double click on the file;
   * an editor needs to be available for the given file type.
   *
   * @param filePath Notebook path
   * @returns Action success status
   */
  async open(filePath: string): Promise<boolean> {
    await this.revealFileInBrowser(filePath);
    const name = path.basename(filePath);

    const fileItem = await this.page.$(
      `xpath=${this.xpBuildFileSelector(name)}`
    );
    if (fileItem) {
      await fileItem.click({ clickCount: 2 });
      await this.page.waitForSelector(Utils.xpBuildActivityTabSelector(name), {
        state: 'visible'
      });
    } else {
      return false;
    }

    return true;
  }

  /**
   * Open the Home directory.
   *
   * @returns Action success status
   */
  async openHomeDirectory(): Promise<boolean> {
    const homeButton = await this.page.$(
      '.jp-FileBrowser .jp-FileBrowser-crumbs span'
    );
    if (!homeButton) {
      return false;
    }
    await homeButton.click();

    await this.page.waitForFunction(() => {
      const spans = document.querySelectorAll(
        '.jp-FileBrowser .jp-FileBrowser-crumbs span'
      );
      return (
        // The home is the root if no preferred dir is defined.
        spans.length === 2 && spans[0].classList.contains('jp-BreadCrumbs-home')
      );
    });

    // wait for DOM rerender
    await this.page.waitForTimeout(200);

    return true;
  }

  /**
   * Open a given directory in the file browser
   *
   * @param dirPath Directory path
   * @returns Action success status
   */
  async openDirectory(dirPath: string): Promise<boolean> {
    if (!(await this.openHomeDirectory())) {
      return false;
    }

    const directories = dirPath.split('/');
    let path = '';

    for (const directory of directories) {
      if (directory.trim() === '') {
        continue;
      }
      if (path !== '') {
        path += '/';
      }

      path += directory;

      if (!(await this._openDirectory(directory))) {
        return false;
      }

      await Utils.waitForCondition(async () => {
        return (await this.getCurrentDirectory()) === path;
      });
    }

    return true;
  }

  /**
   * Trigger a file browser refresh
   */
  async refresh(): Promise<void> {
    const page = this.page;
    const item = await page.$(
      `xpath=//div[@id='filebrowser']//button[${Utils.xpContainsClass(
        'jp-ToolbarButtonComponent'
      )} and .//*[@data-icon='ui-components:refresh']]`
    );

    if (item) {
      // wait for network response or timeout
      await Promise.race([
        page.waitForTimeout(2000),
        this.contents.waitForAPIResponse(async () => {
          await item.click();
        })
      ]);
      // wait for DOM rerender
      await page.waitForTimeout(200);
    } else {
      throw new Error('Could not find refresh toolbar item');
    }
  }

  protected async _openDirectory(dirName: string): Promise<boolean> {
    const item = await this.page.$(
      `xpath=${this.xpBuildDirectorySelector(dirName)}`
    );
    if (item === null) {
      return false;
    }

    await this.contents.waitForAPIResponse(async () => {
      await item.click({ clickCount: 2 });
    });
    // wait for DOM rerender
    await this.page.waitForTimeout(200);

    return true;
  }
}
