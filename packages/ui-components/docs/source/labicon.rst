.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

``LabIcon`` - set up and render icons
=====================================

``LabIcon`` is the icon class used by JupyterLab, and is part of the new
icon system introduced in JupyterLab v2.0.

How JupyterLab handles icons
----------------------------

The @jupyterlab/ui-components package provides icons to the rest of
JupyterLab, in the form of a set of ``LabIcon`` instances (currently
about 80). All of the icons in the core JupyterLab packages are rendered
using one of these ``LabIcon`` instances.

Using the icons in your own code
--------------------------------

You can use any of JupyterLab icons in your own code via an ``import``
statement. For example, to use ``jupyterIcon`` you would first do:

.. code:: typescript

   import { jupyterIcon } from '@jupyterlab/ui-components';

How to render an icon into a DOM node
-------------------------------------

Icons can be added as children to any ``div`` or ``span`` nodes using
the ``icon.element(...)`` method (where ``icon`` is any instance of
``LabIcon``). For example, to render the Jupyter icon you could do:

.. code:: typescript

   jupyterIcon.element({
     container: elem,
     height: '16px',
     width: '16px',
     marginLeft: '2px'
   });

where ``elem`` is any ``HTMLElement`` with a ``div`` or ``span`` tag. As
shown in the above example, the icon can be styled by passing CSS
parameters into ``.element(...)``. Any valid CSS parameter can be used
(one catch: snake case params do have to be converted to camel case:
instead of ``foo-bar: '8px'``, you’d need to use ``fooBar: '8px'``.

How to render an icon as a React component
------------------------------------------

Icons can also be rendered using React. The ``icon.react`` parameter
holds a standard React component that will display the icon on render.
Like any React component, ``icon.react`` can be used in various ways.

For example, here is how you would add the Jupyter icon to the render
tree of another React component:

.. code::

     public render() {
       return (
         <div className="outer">
           <div className="inner">
             <jupyterIcon.react tag="span" right="7px" top="5px" />
             "and here's a text node"
           </div>
         </div>
       );
     }

Alternatively, you can just render the icon directly into any existing
DOM node ``elem`` by using the ``ReactDOM`` module:

.. code:: typescript

   const root = createRoot(elem);
   root.render(jupyterIcon.react);

If do you use ``ReactDOM`` to render, and if the ``elem`` node is ever
removed from the DOM, you’ll first need to clean it up:

.. code:: typescript

   root.unmount();

This cleanup step is not a special property of ``LabIcon``, but is
instead needed for any React component that is rendered directly at the
top level by ``ReactDOM``.

How to create your own custom ``LabIcon``
-----------------------------------------

You can create your own custom icon by constructing a new instance of
``LabIcon``:

.. code:: typescript

   export const fooIcon = new LabIcon({
     name: 'barpkg:foo',
     svgstr: '<svg>...</svg>'
   });

where ``name`` should be of the form “your-pkg:icon-name”, and
``svgstr`` is the raw contents of your icon’s svg file.

How to create a new ``LabIcon`` from an external svg file
---------------------------------------------------------

Although you can copy-and-paste an svg directly into the ``LabIcon``
constructor, the best practice is to keep the svg for each of your icons
in its own separate svg file. You will need to have an ``svg.d.ts`` file
at the root of your project’s ``src`` directory:

.. code:: typescript

   // svg.d.ts

   declare module '*.svg' {
     const value: string;
     export default value;
   }

You can then ``import`` the contents of an svg file:

.. code:: typescript

   import fooSvgstr from 'path-to-your/foo.svg';

   export const fooIcon = new LabIcon({
     name: 'barpkg:foo',
     svgstr: fooSvgstr
   });

Sync icon color to JupyterLab theme
-----------------------------------

.. raw:: html

   <em>Example svgs with class annotation can be found in <a href="https://github.com/jupyterlab/jupyterlab/tree/f0153e0258b32674c9aec106383ddf7b618cebab/packages/ui-components/style/icons">ui-components/style/icons</a></em>

|
| You can ensure that the colors of your custom ``LabIcon`` sync up to the colors of the current JupyterLab theme by adding appropriate ``class`` annotations to each colored element of your icon's svg.
|
| In other words, each element of your svg that a ``fill="..."`` or a ``stroke="..."`` property should also have a ``class="jp-icon<whatever>"`` property.

Available icon classes
^^^^^^^^^^^^^^^^^^^^^^

.. raw:: html

   <em>Icon-related CSS classes are defined in <a href="https://github.com/jupyterlab/jupyterlab/blob/4.4.x/packages/ui-components/style/icons.css">ui-components/style/icons.css</a></em>

|
| All colors shown are for the standard light/dark theme, mouse over for hex values.

``jp-iconX``: contrast to theme background
""""""""""""""""""""""""""""""""""""""""""

.. raw:: html

   <ul>
   <li>jp-icon0: <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#111"/><title>#111</title></svg> / <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#fff"/><title>#fff</title></svg></li>
   <li>jp-icon1: <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#212121"/><title>#212121</title></svg> / <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#fff"/><title>#fff</title></svg></li>
   <li>jp-icon2: <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#424242"/><title>#424242</title></svg> / <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#eee"/><title>#eee</title></svg></li>
   <li>jp-icon3: <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#616161"/><title>#616161</title></svg> / <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#bdbdbd"/><title>#bdbdbd</title></svg></li>
   <li>jp-icon4: <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#757575"/><title>#757575</title></svg> / <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#757575"/><title>#757575</title></svg></li>
   </ul>

Most one-color icons in JupyterLab (including the sidebar and toolbar
icons) are colored using the ``jp-icon3`` class.

For light/dark themes, ``jp-icon0`` corresponds to the darkest/lightest
background color, while ``jp-icon1`` is somewhat lighter/darker, and so
forth.

``jp-icon-accentX``: match to theme background
""""""""""""""""""""""""""""""""""""""""""""""

.. raw:: html

   <ul>
   <li>jp-icon-accent0: <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#fff"/><title>#fff</title></svg> / <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#111"/><title>#111</title></svg></li>
   <li>jp-icon-accent1: <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#fff"/><title>#fff</title></svg> / <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#212121"/><title>#212121</title></svg></li>
   <li>jp-icon-accent2: <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#eee"/><title>#eee</title></svg> / <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#424242"/><title>#424242</title></svg></li>
   <li>jp-icon-accent3: <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#bdbdbd"/><title>#bdbdbd</title></svg> / <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#616161"/><title>#616161</title></svg></li>
   <li>jp-icon-accent4: <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#757575"/><title>#757575</title></svg> / <svg width="16" viewBox="0 0 1 1"><rect width="1" height="1" fill="#757575"/><title>#757575</title></svg></li>
   </ul>

For light/dark themes, ``jp-icon-accent0`` corresponds to the
lightest/darkest background color, while ``jp-icon-accent1`` is somewhat
darker/lighter, and so forth.

Activity icons
""""""""""""""

Activity icons have their own set of CSS properties as it may not make sense to link them
to a theme color. Here is a list of icons and the related properties:

=========== ============================= =====================================
   Icon             Primary color                    Secondary color
=========== ============================= =====================================
jupyter     ``jp-jupyter-icon-color``     None
notebook    ``jp-notebook-icon-color``    None
json        ``jp-json-icon-color``        None
console     ``jp-console-icon-color``     ``jp-console-icon-background-color``
terminal    ``jp-terminal-icon-color``    ``jp-terminal-icon-background-color``
text editor ``jp-text-editor-icon-color`` None
inspector   ``jp-inspector-icon-color``   None
=========== ============================= =====================================

Adding classes to a one-color icon
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

For most simple, one-color icons, it is desirable for the icon's color
to strongly contrast with that of the application's background. You can
achieve this using one of the ``jp-iconX`` classes.

**Example: check icon**

*svg source:*

.. code:: html

   <svg xmlns="http://www.w3.org/2000/svg" width="100" viewBox="0 0 24 24">
     <path class="jp-icon3" fill="#616161" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
   </svg>

*rendered icon:*

.. raw:: html

   <svg xmlns="http://www.w3.org/2000/svg" width="100" viewBox="0 0 24 24">
     <path class="jp-icon3" fill="#616161" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
   </svg>

Adding classes to a multi-colored icon
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

For more complex icons, each element that needs to match the background
should be annotated with a ``jp-icon-accentX`` class, while each element
that needs to contrast with the background should be annotated with a
``jp-iconX`` class.

**Example: close-circle icon**

*svg source:*

.. code:: html

   <svg xmlns="http://www.w3.org/2000/svg" width="100" viewBox="0 0 24 24">
     <circle class="jp-icon3" fill="#616161" cx="12" cy="12" r="11"/>
     <rect class="jp-icon-accent0" fill="#fff" height="18" width="2" x="11" y="3" transform="rotate(315, 12, 12)"/>
     <rect class="jp-icon-accent0" fill="#fff" height="18" width="2" x="11" y="3" transform="rotate(45, 12, 12)"/>
   </svg>

*rendered icon:*

.. raw:: html

   <svg xmlns="http://www.w3.org/2000/svg" width="100" viewBox="0 0 24 24">
     <circle class="jp-icon3" fill="#616161" cx="12" cy="12" r="11"/>
     <rect class="jp-icon-accent0" fill="#fff" height="18" width="2" x="11" y="3" transform="rotate(315, 12, 12)"/>
     <rect class="jp-icon-accent0" fill="#fff" height="18" width="2" x="11" y="3" transform="rotate(45, 12, 12)"/>
   </svg>

Background
----------

Icon handling in Jupyterlab
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Pre JupyterLab 2.0, most icons were created using the icons-as-css-background
pattern:

-  Set up the icon’s svg as a ``background-image`` in CSS:

   .. code:: css

      /* CSS */

      .jp-FooIcon {
        background-image: url('path-to-your/foo.svg');
      }

-  Add the icon to the DOM by constructing an otherwise empty DOM node
   with the appropriate class:

   .. code:: typescript

      // typescript

      const e = document.createElement('div');
      e.className = 'jp-FooIcon';
      document.body.append(e);

What you end up with is a single DOM node that has the “foo” icon as a
background image.

Post JupyterLab 2.0, nearly all icons in core are now created using
`LabIcon <https://github.com/jupyterlab/jupyterlab/blob/f0153e0258b32674c9aec106383ddf7b618cebab/packages/ui-components/src/icon/labicon.tsx>`__
and the icons-as-inline-svg pattern:

-  Construct a new instance of LabIcon from the icon’s name and svg:

   .. code:: typescript

      // typescript

      // svgstr is the raw contents of an icon's svg file
      export const fooIcon = new LabIcon({
        name: 'barpkg:foo',
        svgstr: '<svg>...</svg>'
      });

-  Add the icon to the DOM using the appropriate property of your
   LabIcon instance (either LabIcon.element() to directly create a DOM
   node, or LabIcon.react to get the icon as a react component):

   .. code:: typescript

      // typescript

      const e = fooIcon.element();
      document.body.append(e);

What you end up with is a DOM node (by default a ‘div’) that has an
inline svg node as a child.

``background-image`` vs inline svg
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The big limitation of the old icon-as-css-background pattern is that svg
images rendered as ``background-image`` are invisible to CSS. On the
other hand, an icon rendered as an inline svg node is fully exposed to
the CSS. This allows us to dynamically change icon styling as needed
simply by modifying our CSS. Most importantly, this allows us to recolor
icons according to Jupyterlab’s current theme.
