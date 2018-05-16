Virtual DOM and React
---------------------

JupyterLab is based on `PhosphorJS <http://phosphorjs.github.io/>`__,
which provides a flexible ``Widget`` class that handles the following:

-  Resize events that propagate down the Widget hierarchy.
-  Lifecycle events (``onBeforeDetach``, ``onAfterAttach``, etc.).
-  Both CSS-based and absolutely positioned layouts.

In situations where these features are needed, we recommend using
Phosphor's ``Widget`` class directly.

The idea of virtual DOM rendering, which became popular in the
`React <https://reactjs.org/>`__ community, is a very elegant and
efficient way of rendering and updating DOM content in response to
model/state changes.

Phosphor's ``Widget`` class integrates well with ReactJS and we are now
using React in JupyterLab to render leaf content when the above
capabilities are not needed.

An example of using React with Phosphor can be found in the
`launcher <https://github.com/jupyterlab/jupyterlab/blob/master/packages/launcher/src/index.tsx>`__
of JupyterLab.
