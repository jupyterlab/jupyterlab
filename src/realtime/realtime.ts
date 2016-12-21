// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal
} from '@phosphor/signaling';

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
   * Share a realtime model.
   *
   * @param model: the model to be shared.
   *
   * @returns a promise that is resolved when the model
   *   has been successfully shared.
   */
  shareDocument(model: IRealtimeModel): Promise<void>;

  /**
   * Open a realtime model that has been shared.
   *
   * @param model: the model to be shared.
   *
   * @returns a promise that is resolved when the model
   *   has been successfully opened.
   */
  openSharedDocument(model: IRealtimeModel): Promise<void>;

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
   *
   * @param callback: an optional callback function which is 
   *   called with the widget after the `IRealtimeModel` is 
   *   registered as collaborative.
   */
  //addRealtimeTracker( tracker: InstanceTracker<Widget>, getModel : (widget: Widget)=>IRealtimeModel, callback: (widget: Widget)=>void = ()=>{} ): void; 

  /**
   * Get a tracker, model, and callback for a widget, for
   * use in registering an `IRealtimeModel` associated with
   * the widget as collaborative.
   *
   * @param widget: the widget in question.
   *
   * @returns [getModel, callback] if `widget` belongs
   * to one of the trackers, [null, null] otherwise.
   */
  //checkTracker( widget: Widget ) : [ (widget: Widget)=>IRealtimeModel, (widget: Widget)=>void];

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
}


/**
 * Interface for an object that coordinates realtime collaboration between
 * objects. These objects are expected to subscribe to the handler using
 * IRealtimeModel.registerCollaborative( handler : IRealtimeHandller)`.
 * There should be one realtime handler per realtime model.
 */
export
interface IRealtimeHandler {
  /**
   * Create a string for the realtime model.
   *
   * @param str: the string to link to a realtime string.
   *
   * @returns a promise when the linking is done.
   */
  linkString(str: IObservableString): Promise<void>;

  /**
   * Create a vector for the realtime model.
   *
   * @param factory: a method that takes a `JSONObject` representing a
   *   serialized vector entry, and creates an object from that.
   *
   * @param initialValue: the optional initial value of the vector.
   *
   * @returns a promise of a realtime vector.
   */
  linkVector<T extends ISynchronizable<T>>(vec: IObservableUndoableVector<T>): Promise<void>;
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

let trackerSet = new Set<[InstanceTracker<Widget>, (widget: Widget)=>IRealtimeModel, (widget: Widget)=>void]>();

export
function addRealtimeTracker( tracker: InstanceTracker<Widget>, getModel: (widget: Widget)=>IRealtimeModel, callback: (widget: Widget)=>void = ()=>{} ): void {
  trackerSet.add([tracker, getModel, callback]);
}

export
function checkTracker( widget: Widget ): [IRealtimeModel, (widget:Widget)=>void] {
  let model: IRealtimeModel = null;
  let callback: (widget: Widget)=>void = null;
  trackerSet.forEach( ([tracker, getModel, cb]) => {
    if (tracker.has(widget)) {
      model = getModel(widget);
      callback = cb;
    }
  });
  return [model,callback];
}
