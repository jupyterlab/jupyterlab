// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata, describe, test } from '@jupyterlab/galata';
import { runMenuOpenTest, runSidebarOpenTest } from './util';

jest.setTimeout(100000);

describe('General Tests', () => {
  beforeAll(async () => {
    await galata.resetUI();
    galata.context.capturePrefix = 'general';
  });

  afterAll(async () => {
    galata.context.capturePrefix = '';
  });

  test('Launch Screen', async () => {
    await galata.capture.screenshot('launch');
    expect(await galata.capture.compareScreenshot('launch')).toBe('same');
  });

  runMenuOpenTest();

  runSidebarOpenTest();

  test('Enter Simple Mode', async () => {
    await galata.toggleSimpleMode(true);
    expect(await galata.isInSimpleMode()).toBeTruthy();

    await galata.capture.screenshot('simple-mode');
    expect(await galata.capture.compareScreenshot('simple-mode')).toBe('same');
  });

  test('Leave Simple Mode', async () => {
    await galata.toggleSimpleMode(false);
    expect(await galata.isInSimpleMode()).toBeFalsy();
  });

  test('Toggle Dark theme', async () => {
    await galata.theme.setDarkTheme();
    await galata.capture.screenshot('dark-theme');
    expect(await galata.capture.compareScreenshot('dark-theme')).toBe('same');
  });

  test('Toggle Light theme', async () => {
    await galata.theme.setLightTheme();
  });

  test('Move File Browser to Right', async () => {
    await galata.sidebar.moveTabToRight('filebrowser');
    expect(await galata.sidebar.getTabPosition('filebrowser')).toBe('right');
  });

  test('Open File Browser on Right', async () => {
    await galata.sidebar.openTab('filebrowser');
    expect(await galata.sidebar.isTabOpen('filebrowser')).toBeTruthy();
  });

  test('Close Sidebar on Right', async () => {
    await galata.sidebar.close('right');
    expect(await galata.sidebar.isOpen('right')).toBeFalsy();
  });

  test('Open Sidebar on Right', async () => {
    await galata.sidebar.open('right');
    expect(await galata.sidebar.isOpen('right')).toBeTruthy();
  });

  test('Capture File Browser on Right', async () => {
    const filebrowser = await galata.sidebar.getContentPanel('right');
    await galata.capture.screenshot('filebrowser-right', filebrowser);
    await galata.capture.screenshot('filebrowser-right-2');
  });

  test('Move File Browser to Left', async () => {
    await galata.sidebar.moveTabToLeft('filebrowser');
    expect(await galata.sidebar.getTabPosition('filebrowser')).toBe('left');
  });

  test('Open File Browser on Left', async () => {
    await galata.sidebar.openTab('filebrowser');
    expect(await galata.sidebar.isTabOpen('filebrowser')).toBeTruthy();
  });

  test('Capture File Browser on Left', async () => {
    const filebrowser = await galata.sidebar.getContentPanel('left');
    await galata.capture.screenshot('filebrowser-left', filebrowser);
    await galata.capture.screenshot('filebrowser-left-2');
  });
});
