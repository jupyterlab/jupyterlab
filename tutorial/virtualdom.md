# Virtual DOM

JupyterLab is based on [PhosphorJS](http://phosphorjs.github.io/), which
provides a flexible `Widget` class that handles the following:

* Resize events that propagate down the Widget heirarchy.
* Lifecycle events (`onBeforeDetach`, `onAfterAttach`, etc.).
* Both CSS-based and absolutely postioned layouts.

The idea of virtual DOM rendering, which became popular in the
[ReactJS](https://facebook.github.io/react/) community, is a very elegant
and efficient way of rendering and updating DOM content in response to
model/state changes. The base `Widget` class in PhosphorJS does not use virtual
DOM rendering, however Phosphor provides a lightweight virtual DOM API that can
be used to render leaf content inside a `Widget`. However, the virtual DOM
API in PhosphorJS is implemented in a manner that is unopinionated about how
it is used.

In JupyterLab, we provide a more opinionated API for using virtual DOM
rendering following best practices. This API can be found in `common/vdom.ts`
and offers two classes:

* `VDomModel`
* `VDomWidget`

To use these classes, we recommend the following approach.

First, import the virtual DOM API from PhosphorJS and JupyterLab:

```typescript
import {
  h, VNode
} from 'phosphor/lib/ui/vdom';

import {
  VDomModel, VDomWidget
} from '../common/vdom'; // From another JupyterLab plugin
```

Second, create a subclass of `VDomModel` that contains all of the state needed
to render the content:

```typescript
class TestModel extends VDomModel {
  get myvalue(): string {
    return this._myvalue;
  }

  set myvalue(newValue: string) {
    this._myvalue = newValue;
    this.stateChanged.emit(void 0);
  }

  private _myvalue = '';
}
```

For each attribute that is part of your model, you will implement a `get` and `set`
method as we have done here for the `myvalue` attribute. All of the `set` methods
in your model should end by calling `this.stateChanged.emit(void 0)`.

Third, create a subclass of `VDomWidget` that has a `render()` method that uses Phosphor's
virtual DOM API and returns a PhosphorJS `VNode` or an array of them:

```typescript
class TestWidget extends VDomWidget<TestModel> {
  protected render(): VNode | VNode[] {
    return h.span(this.model.myvalue);
  } 
}
```

Now anytime the model is changed, the content will be rendered on the page efficiently using the virtual
DOM approach.


