// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DataConnector } from '@jupyterlab/statedb';

import { CompletionHandler } from './handler';

/**
 * DummyConnector's fetch method always returns a rejected Promise.
 * This class is only instantiated if both CompletionHandler._connector and
 * CompletionHandler._fetchItems are undefined.
 */
export class DummyConnector extends DataConnector<
  CompletionHandler.IReply,
  void,
  CompletionHandler.IRequest
> {
  fetch(_: CompletionHandler.IRequest): Promise<CompletionHandler.IReply> {
    return Promise.reject(
      'Attempting to fetch with DummyConnector. Please ensure connector responseType is set.'
    );
  }
}
