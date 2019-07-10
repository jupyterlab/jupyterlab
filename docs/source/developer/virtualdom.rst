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

.. literalinclude:: virtualdom.create.tsx
   :force:


Here we use the ``create`` static method to transform a React element
into a Phosphor widget. Whenever the widget is mounted, the React
element will be rendered on the page.

If you need to handle other life cycle events on the Phosphor widget
or add other methods to it, you can subbclass ``ReactWidget`` and
override the ``render`` method to return a React element:


.. literalinclude:: virtualdom.reactwidget.tsx
   :force:


We use Phosphor `Signals <https://phosphorjs.github.io/phosphor/api/signaling/interfaces/isignal.html>`__ to represent
data that changes over time in JupyterLab.
To have your React element change in response to a signal event, use the ``UseSignal`` component,
which implements the `"render props" <https://reactjs.org/docs/render-props.html>`__.

The `running component <https://github.com/jupyterlab/jupyterlab/blob/master/packages/running/src/index.tsx>`__
and the ``createSearchOverlay`` function in the `search overlay <https://github.com/jupyterlab/jupyterlab/blob/master/packages/documentsearch/src/searchoverlay.tsx>`__
use both of these features and serve as a good reference for best practices.

We currently do not have a way of embedding Phosphor widgets inside of React components. If you find yourself trying to do this, we would recommend either converting the Phosphor widget to a React component or using a Phosphor widget for the outer layer component.

We follow the `React documentation <https://reactjs.org/docs/thinking-in-react.html>`__ and
`"React & Redux in TypeScript - Static Typing Guide" <https://github.com/piotrwitek/react-redux-typescript-guide#readme>`__
for best practices on using React in TypeScript.
