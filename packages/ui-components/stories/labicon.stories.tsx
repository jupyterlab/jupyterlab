/**
 * Example story for styling an icon.
 */
// need this to avoid
// TS2686: 'React' refers to a UMD global, but the current file is a module.
import React from 'react';

import { buildIcon, runningIcon, html5Icon } from '../src';

import '@jupyterlab/application/style/index.css';
import '@jupyterlab/theme-light-extension/style/index.css';

export default {
  // component: LabIcon,
  title: 'LabIcon'
};

export const build = () => <buildIcon.react stylesheet="sideBar" />;

export const running = () => <runningIcon.react height="800px" width="800px" />;

export const html5 = () => (
  <div className="foobar" style={{ height: '500px', width: '500px' }}>
    <html5Icon.react elementPosition="center" />
  </div>
);
