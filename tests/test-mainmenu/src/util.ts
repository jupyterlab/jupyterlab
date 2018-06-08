// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IMenuExtender
} from '@jupyterlab/mainmenu';

import {
  Widget
} from '@phosphor/widgets';

/**
 * Given a widget and a set containing IMenuExtenders,
 * check the tracker and return the extender, if any,
 * that holds the widget.
 */
function findExtender<E extends IMenuExtender<Widget>>(widget: Widget, s: Set<E>): E {
  let extender: E;
  s.forEach(value => {
    if (value.tracker.has(widget)) {
      extender = value;
    }
  });
  return extender;
}

/**
 * A utility function that delegates command execution
 * to an IMenuExtender.
 */
export
function delegateExecute<E extends IMenuExtender<Widget>>(widget: Widget, s: Set<E>, executor: keyof E): Promise<any> {
    const extender = findExtender(widget, s);
    if (!extender) {
      return Promise.resolve(void 0);
    }
    // Coerce the result to be a function. When Typedoc is updated to use
    // Typescript 2.8, we can possibly use conditional types to get Typescript
    // to recognize this is a function.
    let f = extender[executor] as any as (w: Widget) => Promise<any>;
    return f(widget);
}

/**
 * A utility function that delegates whether a command is toggled
 * for an IMenuExtender.
 */
export
function delegateToggled<E extends IMenuExtender<Widget>>(widget: Widget, s: Set<E>, toggled: keyof E): boolean {
  const extender = findExtender(widget, s);
  if (extender && extender[toggled]) {
    // Coerce the result to be a function. When Typedoc is updated to use
    // Typescript 2.8, we can possibly use conditional types to get Typescript
    // to recognize this is a function.
    let f = extender[toggled] as any as (w: Widget) => boolean;
    return f(widget);
  }
  return false;
}
