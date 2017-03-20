// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from '@phosphor/disposable';

import {
  JSONObject, Token
} from '@phosphor/coreutils';

import {
  IObservableString
} from './observablestring';

import {
  IObservableVector
} from './observablevector';

import {
  IObservableMap
} from './observablemap';

import {
  IModelDB
} from './modeldb';

/* tslint:disable */
/**
 * The realtime service token.
 */
export
const IRealtime = new Token<IRealtime>('jupyter.services.realtime');
/* tslint:enable */


/**
 * Interface for a Realtime service.
 */
export
interface IRealtime {

  /**
   * Share a realtime model with a collaborator.
   *
   * @param model: The model to be shared.
   *
   * @returns a promise that is resolved when the model
   *   has been successfully shared.
   */
  addCollaborator(model: IRealtimeModel): Promise<void>;

  /**
   * Share a model through the realtime services.
   *
   * @param model: The model to be shared.
   *
   * @param uid: Optional unique identifier for the model,
   *   which can be used to identify it across different clients.
   *
   * @returns a promise that is resolved when the model
   *   has been successfully opened.
   */
  shareModel(model: IRealtimeModel, uid?: string): Promise<void>;

  /**
   * The realtime services may require some setup before
   * it can be used (e.g., loading external APIs, authorization).
   * This promise is resolved when the services are ready to
   * be used.
   */
  ready: Promise<void>;
}

/**
 * Interface for an object which has the ability to be shared via
 * the realtime interface. These objects are required to implement
 * method `registerCollaborative( handler : IRealtimeHandler)`
 * which describes to the handler the members which are realtime-enabled.
 */
export
interface IRealtimeModel {

  /**
   * The realtime handler associated with this realtime model.
   * Should only be non-null after registerCollaborative() has
   * successfully resolved.
   */
  readonly realtimeHandler: IRealtimeHandler;

  /**
   * Register this object as collaborative.
   *
   * @param handler: the realtime handler to which the model
   *   describes itself.
   *
   * @returns a promise that is resolved when the model is done
   * registering itself as collaborative.
   */
  registerCollaborative (handler: IRealtimeHandler): Promise<void>;
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
 * A type which is able to be synchronized between collaborators
 */
export
type Synchronizable = JSONObject | IObservableMap<any> | IObservableVector<any> | IObservableString;

export
interface IRealtimeConverter<T> {
  from(value: Synchronizable): T;

  to(value: T): Synchronizable;
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
