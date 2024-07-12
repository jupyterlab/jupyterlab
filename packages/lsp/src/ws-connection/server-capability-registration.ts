/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// Disclaimer/acknowledgement: Fragments are based on https://github.com/wylieconlon/lsp-editor-adapter,
// which is copyright of wylieconlon and contributors and ISC licenced.
// ISC licence is, quote, "functionally equivalent to the simplified BSD and MIT licenses,
// but without language deemed unnecessary following the Berne Convention." (Wikipedia).
// Introduced modifications are BSD licenced, copyright JupyterLab development team.

import {
  Registration,
  ServerCapabilities,
  Unregistration
} from 'vscode-languageserver-protocol';

interface IFlexibleServerCapabilities extends ServerCapabilities {
  [key: string]: any;
}

/**
 * Register the capabilities with the server capabilities provider
 *
 * @param serverCapabilities - server capabilities provider.
 * @param registration -  capabilities to be registered.
 * @return - the new server capabilities provider
 */
function registerServerCapability(
  serverCapabilities: ServerCapabilities,
  registration: Registration
): ServerCapabilities | null {
  const serverCapabilitiesCopy = JSON.parse(
    JSON.stringify(serverCapabilities)
  ) as IFlexibleServerCapabilities;
  const { method, registerOptions } = registration;
  const providerName = method.substring(13) + 'Provider';

  if (providerName) {
    if (!registerOptions) {
      serverCapabilitiesCopy[providerName] = true;
    } else {
      serverCapabilitiesCopy[providerName] = JSON.parse(
        JSON.stringify(registerOptions)
      );
    }
  } else {
    console.warn('Could not register server capability.', registration);
    return null;
  }

  return serverCapabilitiesCopy;
}

/**
 * Unregister the capabilities with the server capabilities provider
 *
 * @param serverCapabilities - server capabilities provider.
 * @param registration -  capabilities to be unregistered.
 * @return - the new server capabilities provider
 */
function unregisterServerCapability(
  serverCapabilities: ServerCapabilities,
  unregistration: Unregistration
): ServerCapabilities {
  const serverCapabilitiesCopy = JSON.parse(
    JSON.stringify(serverCapabilities)
  ) as IFlexibleServerCapabilities;
  const { method } = unregistration;
  const providerName = method.substring(13) + 'Provider';

  delete serverCapabilitiesCopy[providerName];

  return serverCapabilitiesCopy;
}

export { registerServerCapability, unregisterServerCapability };
