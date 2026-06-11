% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

# Design Patterns

There are several design patterns that are repeated throughout the
repository. This guide is meant to supplement the [TypeScript Style
Guide](https://github.com/jupyterlab/jupyterlab/wiki/TypeScript-Style-Guide).

## TypeScript

TypeScript is used in all of the source code. TypeScript is used because
it provides features from the most recent EMCAScript 6 standards, while
providing type safety. The TypeScript compiler eliminates an entire
class of bugs, while making it much easier to refactor code.

## Initialization Options

Objects will typically have an `IOptions` interface for initializing
the widget. The use of this interface enables options to be later added
while preserving backward compatibility.

## ContentFactory Option

A common option for a widget is a `IContentFactory`, which is used to customize the child content in the widget.

If not given, a `defaultRenderer` instance is used if no arguments are required. In this way, widgets can be customized without subclassing them, and widgets can support customization of their nested content.

## Static Namespace

An object class will typically have an exported static namespace sharing
the same name as the object. The namespace is used to declutter the
class definition.

## Private Module Namespace

The "Private" module namespace is used to group variables and functions that are not intended to be exported and may have otherwise existed as module-level variables and functions. The use of the namespace also makes it clear when a variable access is to an imported name or from the module itself. Finally, the namespace enables the entire section to be collapsed in an editor if desired.

## Disposables

JavaScript does not support "destructors", so the `IDisposable` pattern is used to ensure resources are freed and can be claimed by the Garbage Collector when no longer needed. It should always be safe to `dispose()` of an object more than once. Typically the object that creates another object is responsible for calling the dispose method of that object unless explicitly stated otherwise.

To mirror the pattern of construction, `super.dispose()` should be called last in the `dispose()` method if there is a parent class. Make sure any signal connections are cleared in either the local or parent `dispose()` method. Use a sentinel value to guard against reentry, typically by checking if an internal value is null, and then immediately setting the value to null. A subclass should never override the `isDisposed` getter, because it short-circuits the parent class getter. The object should not be considered disposed until the base class `dispose()` method is called.

## Messages

Messages are intended for many-to-one communication where outside objects influence another object. Messages can be conflated and processed as a single message. They can be posted and handled on the next animation frame.

## Signals

Signals are intended for one-to-many communication where outside objects react to changes on another object. Signals are always emitted with the sender as the first argument, and contain a single second argument with the payload. Signals should generally not be used to trigger the "default" behavior for an action, but to enable others to trigger additional behavior. If a "default" behavior is intended to be provided by another object, then a callback should be provided by that object. Wherever possible a signal connection should be made with the pattern `.connect(this._onFoo, this)`. Providing the `this` context enables the connection to be properly cleared by `Signal.clearData(this)`. Using a private method avoids allocating a closure for each connection.

## Models

Some of the more advanced widgets have a model associated with them. The common pattern used is that the model is settable and must be set outside of the constructor. This means that any consumer of the widget must account for a model that may be `null`, and may change at any time. The widget should emit a `modelChanged` signal to enable consumers to handle a change in model. The reason to enable a model to swap is that the same widget could be used to display different model content while preserving the widget's location in the application. The reason the model cannot be provided in the constructor is the initialization required for a model may have to call methods that are subclassed. The subclassed methods would be called before the subclass constructor has finished evaluating, resulting in undefined state.

(getters-vs-methods)=

## Getters vs. Methods

Prefer a method when the return value must be computed each time. Prefer a getter for simple attribute lookup. A getter should yield the same value every time.

## Data Structures

For public API, we have three options: JavaScript `Array`, `IIterator`, and `ReadonlyArray` (an interface defined by TypeScript).

Prefer an `Array` for:

- A value that is meant to be mutable.

Prefer a `ReadonlyArray` for:

- A return value is the result of a newly allocated array, to avoid the extra allocation of an iterator.
- A signal payload - since it will be consumed by multiple listeners.
- The values may need to be accessed randomly.
- A public attribute that is inherently static.

Prefer an `IIterator` for:

- A return value where the value is based on an internal data structure but the value should not need to be accessed randomly.
- A set of return values that can be computed lazily.

## DOM Events

If an object instance should respond to DOM events, create a `handleEvent` method for the class and register the object instance as the event handler. The `handleEvent` method should switch on the event type and could call private methods to carry out the actions. Often a widget class will add itself as an event listener to its own node in the `onAfterAttach` method with something like `this.node.addEventListener('mousedown', this)` and unregister itself in the `onBeforeDetach` method with `this.node.removeEventListener('mousedown', this)`. Dispatching events from the `handleEvent` method makes it easier to trace, log, and debug event handling. For more information about the `handleEvent` method, see the [EventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventListener) API.

## Promises

We use Promises for asynchronous function calls, and a shim for browsers that do not support them. When handling a resolved or rejected Promise, make sure to check for the current state (typically by checking an `.isDisposed` property) before proceeding.

## Server Requests

To allow hot-swapping the Jupyter Server in custom applications based of JupyterLab components, the request URL should be composed using the base URL from the {ts:interface}`services.ServerConnection.ISettings` instance derived from the service manager, passed down via class constructors as needed. The {ts:function}`coreutils.PageConfig.getBaseUrl` should not be used directly. The following snippets demonstrate the best practice:

```typescript
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ServerConnection } from '@jupyterlab/services';
import { URLExt } from '@jupyterlab/coreutils';

export class MyAPIClient {
  constructor(options: MyAPIClient.IOptions = {}) {
    this._serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
  }
  get apiURL() {
    // If URL needs to be exposed, use a getter to allow hot-swapping
    const { baseUrl } = this._serverSettings;
    return URLExt.join(baseUrl, 'my-api');
  }
  async fetch() {
    const { makeRequest } = ServerConnection;
    const response: Response = await makeRequest(
      this.apiURL,
      {},
      this._serverSettings
    );

    // Do something with the response
    console.log(response);
  }
  private _serverSettings: ServerConnection.ISettings;
}

export namespace MyAPIClient {
  export interface IOptions {
    serverSettings?: ServerConnection.ISettings;
  }
}

export const plugin: JupyterFrontEndPlugin<MyAPIClient> = {
  id: 'my-extension-name:MyAPIClient',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    return new MyAPIClient({
      serverSettings: app.serviceManager.serverSettings
    });
  }
};
```

## Command Names

Commands used in the application command registry should be formatted as follows: `package-name:verb-noun`. They are typically grouped into a `CommandIDs` namespace in the extension that is not exported.

## Dialogs

Buttons in dialogs with a single, dismissal button (e.g., _About JupyterLab_) should have the following attributes:

- Button variant: Cancel (`Dialog.cancelButton()`)
- Label: `Close`
