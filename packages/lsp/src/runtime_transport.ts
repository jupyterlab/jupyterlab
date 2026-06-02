// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  ILanguageServerManager,
  ILanguageServerProvider,
  TLanguageServerId
} from './tokens';

const transportsByManager = new WeakMap<
  ILanguageServerManager,
  Map<TLanguageServerId, ILanguageServerProvider.TTransportFactory>
>();

export function setLanguageServerTransports(
  manager: ILanguageServerManager,
  transports: Map<TLanguageServerId, ILanguageServerProvider.TTransportFactory>
): void {
  if (transports.size === 0) {
    transportsByManager.delete(manager);
    return;
  }
  transportsByManager.set(manager, new Map(transports));
}

export function getLanguageServerTransport(
  manager: ILanguageServerManager,
  languageServerId: TLanguageServerId
): ILanguageServerProvider.TTransportFactory | null {
  const transports = transportsByManager.get(manager);
  if (!transports) {
    return null;
  }
  return transports.get(languageServerId) ?? null;
}
