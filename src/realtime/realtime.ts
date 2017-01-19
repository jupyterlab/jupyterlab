// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal
} from '@phosphor/signaling';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Token
} from '@phosphor/application';

import {
  Widget
} from '@phosphor/widgets';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  IObservableString
} from '../common/observablestring';

import {
  IObservableVector
} from '../common/observablevector';

import {
  IObservableMap
} from '../common/observablemap';

import {
  IObservableUndoableVector, ISerializable
} from '../common/undoablevector';

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
   * Register a realtime collaborative object with the
   * realtime services.
   *
   * @param tracker: a widget tracker that contains some
   *   shareable item.
   *
   * @param getModel: a function which takes a shareable widget
   *   and returns an object that implements `IRealtimeModel`,
   *   the actual collaborative data model.
   */
  addTracker(tracker: InstanceTracker<Widget>, getModel: (widget: Widget)=>IRealtimeModel): void; 

  /**
   * Get a realtime model for a widget, for
   * use in registering an `IRealtimeModel` associated with
   * the widget as collaborative.
   *
   * @param widget: the widget in question.
   *
   * @returns an `IRealtimeModel` if `widget` belongs
   * to one of the realtime trackers, `null` otherwise.
   */
  checkTrackers( widget: Widget ): IRealtimeModel;

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
   * Register this object as collaborative.
   *
   * @param handler: the realtime handler to which the model
   *   describes itself.
   *
   * @returns a promise that is resolved when the model is done
   * registering itself as collaborative.
   */
  registerCollaborative (handler: IRealtimeHandler): Promise<void>;

  /**
   * The realtime handler associated with this realtime model.
   * Should only be non-null after registerCollaborative() has
   * successfully resolved.
   */
  readonly realtimeHandler: IRealtimeHandler;
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
   * Create a string for the realtime model.
   *
   * @param str: the string to link to a realtime string.
   *
   * @param id: an identifier for this collaborative object
   *   which is unique to the `IRealtimeHandler`.
   *   The `IRealtimeModel` describing itself to the handler
   *   is responsible for avoiding name collisions.
   *
   * @returns a promise when the linking is done.
   */
  linkString(str: IObservableString, id: string): Promise<void>;

  /**
   * Create a vector for the realtime model.
   *
   * @param vec: the vector to link to a realtime vector.
   *
   * @param id: an identifier for this collaborative object
   *   which is unique to the `IRealtimeHandler`.
   *   The `IRealtimeModel` describing itself to the handler
   *   is responsible for avoiding name collisions.
   *
   * @returns a promise when the linking is done.
   */
  linkVector<T extends ISynchronizable<T>>(vec: IObservableUndoableVector<T>, id: string): Promise<void>;
}

/**
 * Interface for an object which is both able to be serialized,
 * as well as able to signal a request for synchronization
 * through an IRealtimeHandler. This request may be every time
 * the object changes, or it may be batched in some way.
 */
export
interface ISynchronizable<T> extends ISerializable {
  /**
   * A signal that is emitted when a synchronizable object
   * requests to be synchronized through the realtime handler.
   */
  readonly synchronizeRequest: ISignal<T, void>;
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

  /**
   * A representation of the position of the collaborator
   * in the collaborative document. This can include, but
   * is not limited to, the cursor position. Different
   * widgets are responsible for setting/reading this value.
   */
  position: JSONObject;
}
