// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from '@phosphor/disposable';

import {
  IObservableMap
} from './observablemap';

import {
  IModelDB
} from './modeldb';

/**
 * Interface for a Realtime service.
 */
export
interface IRealtime {
  /**
   * The realtime services may require some setup before
   * it can be used (e.g., loading external APIs, authorization).
   * This promise is resolved when the services are ready to
   * be used.
   */
  ready: Promise<void>;

  /**
   * Create an IRealtimeHandler for use with a document or other
   * model.
   *
   * @param path: a path that identifies the location of the realtime
   *   store in the backend.
   */
  createHandler(path: string): IRealtimeHandler;
}


/**
 * Interface for an object that coordinates realtime collaboration between
 * objects. These objects are expected to subscribe to the handler using
 * IRealtimeModel.registerCollaborative( handler : IRealtimeHandller)`.
 * There should be one realtime handler per realtime model.
 */
export
interface IRealtimeHandler extends IDisposable {
  /**
   * A map of the currently active collaborators
   * for the handler, including the local user.
   */
  readonly collaborators: IObservableMap<ICollaborator>;

  /**
   * The local collaborator.
   */
  readonly localCollaborator: ICollaborator;

  /**
   * An IModelDB for this handler.
   */
  readonly modelDB: IModelDB;

  /**
   * A promise resolved when the handler is ready to
   * be used.
   */
  readonly ready: Promise<void>;
}


/**
 * Interface for an object representing a single collaborator
 * on a realtime model.
 */
export
interface ICollaborator {
  /**
   * A user id for the collaborator.
   * This might not be unique, if the user has more than
   * one editing session at a time.
   */
  readonly userId: string;

  /**
   * A session id, which should be unique to a
   * particular view on a collaborative model.
   */
  readonly sessionId: string;

  /**
   * A human-readable display name for a collaborator.
   */
  readonly displayName: string;

  /**
   * A color to be used to identify the collaborator in
   * UI elements.
   */
  readonly color: string;
}
