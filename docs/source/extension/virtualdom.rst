.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _react:

React
=====


Many JupyterLab APIs require `Lumino`
`Widgets <https://lumino.readthedocs.io/en/latest/api/modules/widgets.Widget.html>`__
which have some additional features over native DOM elements, including:

-  Resize events that propagate down the Widget hierarchy.
-  Lifecycle events (``onBeforeDetach``, ``onAfterAttach``, etc.).
-  Both CSS-based and absolutely positioned layouts.

We support wrapping React components to turn them into Lumino
widgets using the ``ReactWidget`` class from ``@jupyterlab/ui-components``:

.. literalinclude:: virtualdom.create.tsx
   :force:


Here we use the ``create`` static method to transform a React element
into a Lumino widget. Whenever the widget is mounted, the React
element will be rendered on the page.

If you need to handle other life cycle events on the Lumino widget
or add other methods to it, you can subclass ``ReactWidget`` and
override the ``render`` method to return a React element:


.. literalinclude:: virtualdom.reactwidget.tsx
   :force:


We use Lumino `Signals <https://lumino.readthedocs.io/en/latest/api/interfaces/signaling.ISignal.html>`__ to represent
data that changes over time in JupyterLab.
To have your React element change in response to a signal event, use the ``UseSignal`` component from ``@jupyterlab/ui-components``,
which implements the `"render props" <https://reactjs.org/docs/render-props.html>`__:


.. literalinclude:: virtualdom.usesignal.tsx
   :force:


The `running component <https://github.com/jupyterlab/jupyterlab/blob/f2e0cde0e7c960dc82fd9b010fcd3dbd9e9b43d0/packages/running/src/index.tsx#L157-L159>`__
and the ``createSearchOverlay`` function in the `search overlay <https://github.com/jupyterlab/jupyterlab/blob/f2e0cde0e7c960dc82fd9b010fcd3dbd9e9b43d0/packages/documentsearch/src/searchoverlay.tsx#L440-L457>`__
use both of these features and serve as a good reference for best practices.

There is also a `simple example <https://github.com/jupyterlab/extension-examples/tree/71486d7b891175fb3883a8b136b8edd2cd560385/react/react-widget>`_ making
a Lumino react widget in the JupyterLab `extension examples repository <https://github.com/jupyterlab/extension-examples>`_.

We currently do not have a way of embedding Lumino widgets inside of React components. If you find yourself trying to do this, we would recommend either converting the Lumino widget to a React component or using a Lumino widget for the outer layer component.

We follow the `React documentation <https://reactjs.org/docs/thinking-in-react.html>`__ and
`"React & Redux in TypeScript - Static Typing Guide" <https://github.com/piotrwitek/react-redux-typescript-guide#readme>`__
for best practices on using React in TypeScript.
