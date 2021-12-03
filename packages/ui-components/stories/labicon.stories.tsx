/**
 * Example story for styling an icon.
 */
// need this to avoid
// TS2686: 'React' refers to a UMD global, but the current file is a module.
import '@jupyterlab/application/style/index.css';
import '@jupyterlab/theme-light-extension/style/index.css';
import React from 'react';
import { buildIcon, html5Icon, runningIcon } from '../src';

export default {
  // component: LabIcon,
  title: 'LabIcon'
};

export const build = (): JSX.Element => (
  <buildIcon.react stylesheet="sideBar" />
);

export const running = (): JSX.Element => (
  <runningIcon.react height="800px" width="800px" />
);

export const html5 = (): JSX.Element => (
  <div className="foobar" style={{ height: '500px', width: '500px' }}>
    <html5Icon.react elementPosition="center" />
  </div>
);
