// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { createRendermimePlugin } from '@jupyterlab/application/lib/mimerenderers';

import { InstanceTracker } from '@jupyterlab/apputils';

import { MimeDocument } from '@jupyterlab/docregistry';

import extension from './widget';

const tracker = new InstanceTracker<MimeDocument>({
  namespace: 'application-mimedocuments'
});

const plugin = createRendermimePlugin(tracker, extension);

export default plugin;
