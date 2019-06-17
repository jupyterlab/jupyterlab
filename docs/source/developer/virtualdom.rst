.. _react:

React
-----


Many JupyterLab APIs require `Phosphor <https://phosphorjs.github.io/>`__
`Widgets <https://phosphorjs.github.io/phosphor/api/widgets/classes/widget.html>`__
which have some additional features over native DOM elements, including:

-  Resize events that propagate down the Widget hierarchy.
-  Lifecycle events (``onBeforeDetach``, ``onAfterAttach``, etc.).
-  Both CSS-based and absolutely positioned layouts.

We support wrapping React components to turn them into Phosphor
widgets using the ``ReactWidget`` class from ``@jupyterlab/apputils``:

.. code:: typescript

    import * as React from 'react';

    import { Widget } from '@phosphor/widgets';
    import { ReactWidget } from '@jupyterlab/apputils';

    const myWidget: Widget = ReactWidget.create(
        <div>My Widget</div>
    );

Here we use the ``create`` static method to transform a React element
into a Phosphor widget. Whenever the widget is mounted, the React
element will be rendered on the page.

If you need to handle other life cycle events on the Phosphor widget
or add other methods to it, you can subbclass ``ReactWidget`` and
override the ``render`` method to return a React element:


.. code:: typescript

    import * as React from 'react';

    import { Widget } from '@phosphor/widgets';
    import { ReactWidget } from '@jupyterlab/apputils';

    class MyWidget extends ReactWidget {
      render() {
        return <div>My Widget</div>;
      }
    }
    const myWidget: Widget = new MyWidget();


We use Phosphor `Signals <https://phosphorjs.github.io/phosphor/api/signaling/interfaces/isignal.html>`__ to represent
data that changes over time in JupyterLab.
To have your React element change in response to a signal event, use the ``UseSignal`` component,
which implements the `"render props" <https://reactjs.org/docs/render-props.html>`__.

The `running component <https://github.com/jupyterlab/jupyterlab/blob/79e03992b2964063a917184072be3c8819cefa19/packages/running/src/index.tsx>`__
and the `search overlay <https://github.com/jupyterlab/jupyterlab/blob/2834c11945232c3901282a870224ba80a009cf8f/packages/documentsearch/src/searchoverlay.tsx#L439-L458>`__
use both of these features and serve as a good reference for best practices.

We follow the `React documentation <https://reactjs.org/docs/thinking-in-react.html>`__ and
`"React & Redux in TypeScript - Static Typing Guide" <https://github.com/piotrwitek/react-redux-typescript-guide#readme>`__
for best practices on using React in TypeScript.