/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { SyncResolver } from 'jest-resolve';

const resolver: SyncResolver = (path, options) => {
  // Tests use the Node.js WebSocket implementation even in jsdom.
  return options.defaultResolver(path, {
    ...options,
    conditions:
      path === 'ws'
        ? options.conditions?.filter(condition => condition !== 'browser')
        : options.conditions
  });
};

module.exports = resolver;
