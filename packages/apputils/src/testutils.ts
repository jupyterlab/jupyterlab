/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ServiceManager } from '@jupyterlab/services';
import { UUID } from '@lumino/coreutils';
import { SessionContext } from './sessioncontext';

/**
 * Create a client session object.
 */
export async function createSessionContext(
  options: Partial<SessionContext.IOptions> = {}
): Promise<SessionContext> {
  const manager = options.sessionManager ?? Private.getManager().sessions;
  const specsManager = options.specsManager ?? Private.getManager().kernelspecs;

  await Promise.all([manager.ready, specsManager.ready]);
  return new SessionContext({
    kernelManager: options.kernelManager ?? Private.getManager().kernels,
    sessionManager: manager,
    specsManager,
    path: options.path ?? UUID.uuid4(),
    name: options.name,
    type: options.type,
    kernelPreference: options.kernelPreference ?? {
      shouldStart: true,
      canStart: true,
      name: specsManager.specs?.default
    }
  });
}

/**
 * A namespace for private data.
 */
namespace Private {
  let manager: ServiceManager;

  /**
   * Get or create the service manager singleton.
   */
  export function getManager(): ServiceManager {
    if (!manager) {
      manager = new ServiceManager({ standby: 'never' });
    }
    return manager;
  }
}
