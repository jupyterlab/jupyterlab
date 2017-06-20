# CSS Patterns

This document describes the patterns we are using to organize and write
CSS for JupyterLab. JupyterLab is developed using a set of npm packages
that are located in `packages`. Each of these packages has its own style, but
depend on CSS variables dfined in a main theme package.

## CSS checklist

* CSS classnames are defined as all caps file-level `const`s and follow the CSS
  class naming convention described below.
* CSS files for packages are located within the `src/style` subdirecotory and
  imported into the plugin's `index.css`.
* The JupyterLab default CSS variables in the `default-theme` package
  are used to style packages where ever possible. Individual packages should not
  depend on this package though, to allow the theme to be swaped out.
* Additional public/private CSS variables are defined by plugins sparingly and in
  accordance with the conventions described below.

## CSS variables

We are using native CSS variables in JupyterLab. This is to enable dynamic theming
of built-in and third party plugins. As of Septmeber 2016, CSS variables are
supported in the latest stable versions of all popular browsers, except for IE/Edge.
If a JupyterLab deployment needs to support these browsers, a server side CSS
preprocessor such as Myth or cssnext may be used.

### Naming of CSS variables

We use the following convention for naming CSS variables:

* Start all CSS variables with `--jp-`
* Words in the variable name should be lowercase and separated with `-`
* The final segment will typically be related to a CSS properties, such as
  `color`, `font-size` or `background`.
* Intermediate segments should have refer to the component and subcomponent, such
  as `--jp-notebook-cell-`.

### Public/private

Some CSS variables in JupyterLab are considered part of our public API. Others
are considered private and should not be used by third party plugins or themes.
The difference between public and private variables is simple:

* All private variables begin with `--jp-private-`
* All variables without the `private-` prefix are public.
* Public variables should be defined under the `:root` pseudo-selector. This
  ensures that public CSS variables can be inspected under the top-level
  `<html>` tag in the browser's dev tools.
* Where possible, private variables should be defined and scoped under an 
  appropriate selector.

### CSS variable usage

JupyterLab includes a default set of CSS variables in the file:

`packages/default-theme/style/variables.css`

To ensure consistent design in JupyterLab, all built-in and third party
extensions should use these variables in their styles if at all possible.
Documentation about those variables can be found in the `variables.css` file
itself.

Plugins are free to define additional public and private CSS variables in
their own `index.css` file, but should do so sparingly.

Again, we consider the names of the public CSS variables in this package
to be our public API for CSS.

## File organization

We are organizing our CSS files in the following manner:

* Each package in the top-level `packages` directory should contain
  any CSS files in a `style` subdirectory that are needed to style itself.
* Multiple CSS files may be used and organized as needed, but they should be
  imported into a single `index.css` at the top-level of the plugin.
* The `index.css` of each plugin should be imported inside
  `packages/default-theme/style/index.css`.

## CSS class names

We have a fairly formal method for naming our CSS classes.

First, CSS class names are associated with TypeScript classes that extend
`phosphor.Widget`:

The `.node` of each such widget should have a CSS class that matches
the name of the TypeScript class, and those classnames should be defined
as a file-level `const`:

```TypeScript
const MYWIDGET_CLASS = 'jp-MyWidget';

class MyWidget extends Widget {

  constructor() {
    super();
    this.addClass(MYWIDGET_CLASS);
  }

}
```

Second, subclasses should have a CSS class for both the parent and child:

```TypeScript
const MYWIDGET_SUBCLASS_CLASS = 'jp-MyWidgetSubclass';

class MyWidgetSubclass extends MyWidget {

  constructor() {
    super(); // Adds `jp-MyWidget`
    this.addClass(MYWIDGET_SUBCLASS_CLASS);
  }

}
```

In both of these cases, CSS class names with caps-case are reserved for
situations where there is a named TypeScript `Widget ` subclass. These classes
are a way of a TypeScript class providing a public API for styling.

Third, children nodes of a `Widget` should have a third segment in the CSS
class name that gives a semantic naming of the component, such as:

* `jp-MyWidget-toolbar`
* `jp-MyWidget-button`
* `jp-MyWidget-contentButton`

In general, the parent `MyWidget` should add these classes to the children. This
applies when the children are plain DOM nodes or `Widget` instances/subclasses
themselves. Thus, the general naming of CSS classes is of the form
`jp-WidgetName-semanticChild`. This allows the styling of these children in a
manner that is independent of the children implementation or CSS classes they
have themselves.

Fourth, some CSS classes are used to modify the state of a widget:

* `jp-mod-active`: applied to elements in the active state
* `jp-mod-hover`: applied to elements in the hover state
* `jp-mod-selected`: applied to elements while selected

Fifth, some CSS classes are used to distinguish different types of a widget:

* `--jp-type-separator`: applied to menu items that are separators
* `--jp-type-directory`: applied to elements in the file browser that are directories

## Edge cases

Over time, we have found that there are some edge cases that these rules don't
fully address. Here, we try to clarify those edge cases.

**When should a parent add a class to children?**

Above, we state that a parent (`MyWidget`), should add CSS classes to children
that indicate the semantic function of the child. Thus, the `MyWidget` subclass
of `Widget` should add `jp-MyWidget` to itself and `jp-MyWidget-toolbar` to a
toolbar child.

What if the child itself is a `Widget` and already has a proper CSS class name itself,
such as `jp-Toolbar`? Why not use selectors such as `.jp-MyWidget .jp-Toolbar`
or `.jp-MyWidget > .jp-Toolbar`?

The reason is that these selectors are dependent on the implementation of the
toolbar having the `jp-Toolbar` CSS class. When `MyWidget` adds the 
`jp-MyWidget-toolbar` class, it can style the child independent of its
implementation. The other reason to add the `jp-MyWidget-toolbar` class is if
the DOM stucture is highly recursive, the usual descendant selectors may
not be specific to target only the desired children.

When in doubt, there is little harm done in parents adding selectors to children.




