// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  WidgetTracker
} from './index';


/**
 * A widget tracker provider.
 */
export
const widgetTrackerProvider = {
  id: 'jupyter.services.widgetTracker',
  provides: WidgetTracker,
  resolve: () => {
    return tracker;
  }
};


/**
 * A singleton tracker instance.
 */
const tracker = new WidgetTracker();
