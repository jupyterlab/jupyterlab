# @jupyterlab/ui-components

A JupyterLab package that provides UI elements of various types (React components, DOM elements, etc) to core JupyterLab packages and third-party extensions.

# `LabIcon` user guide

`LabIcon` is the icon class used by JupyterLab, and is part of the new icon system introduced in JupyterLab v2.0.

## Background

Pre jlab-2.0, most icons were created using the icons-as-css-background pattern:

- Set up the icon's svg as a `background-image` in CSS:

  ```css
  /* CSS */

  :root {
    --jp-icon-foo: url('path-to-your/foo.svg');
  }

  .jp-FooIcon {
    background-image: var(--jp-icon-foo);
  }
  ```

- Add the icon to the DOM by constructing an otherwise empty DOM node with the appropriate class:

  ```typescript
  // typescript

  const e = document.createElement('div');
  e.className = 'jp-FooIcon';
  document.body.append(e);
  ```

What you end up with is a single DOM node that has the "foo" icon as a background image.

Post jlab-2.0, nearly all icons in core are now created using [LabIcon](https://github.com/jupyterlab/jupyterlab/blob/f0153e0258b32674c9aec106383ddf7b618cebab/packages/ui-components/src/icon/labicon.tsx) and the icons-as-inline-svg pattern:

- Construct a new instance of LabIcon from the icon's name and svg:

  ```typescript
  // typescript

  // svgstr should be the raw contents of your icon's svg file
  export const fooIcon = new LabIcon({
    name: 'barpkg:foo',
    svgstr: '<svg>...</svg>'
  });
  ```

- Add the icon to the DOM using the appropriate property of your LabIcon instance (either LabIcon.element() to directly create a DOM node, or LabIcon.react to get the icon as a react component):

  ```typescript
  // typescript

  const e = fooIcon.element();
  document.body.append(e);
  ```

What you end up with is a DOM node (by default a 'div') that has an inline svg node as a child.

## How JupyterLab handles icons

The ui-components package provides icons to the rest of JupyterLab, in the form of a set of `LabIcon` instances (currently about 80). All of the icons in the core JupyterLab packages are rendered using one of these `LabIcon` instances.

## Using the icons in your own code

You can use any of JupyterLab icons in your own code via an `import` statement. For example, to use `jupyterIcon` you would first do:

```typescript
import { jupyterIcon } from '@jupyterlab/ui-components';
```

## How to render an icon into a DOM node

Icons can be added as children to any `div` or `span` nodes using the `icon.element(...)` method (where `icon` is any instance of `LabIcon`). For example, to render the Jupyter icon you could do:

```typescript
jupyterIcon.element({
  container: elem,
  height: '16px',
  width: '16px',
  marginLeft: '2px'
});
```

where `elem` is any `HTMLElement` with a `div` or `span` tag. As shown in the above example, the icon can be styled by passing CSS parameters into `.element(...)`. Any valid CSS parameter can be used (one catch: snake case params do have to be converted to camel case: instead of `foo-bar: '8px'`, you'd need to use `fooBar: '8px'`.

## How to render an icon as a React component

Icons can also be rendered using React. The `icon.react` parameter holds a standard React component that will display the icon on render. Like any React component, `icon.react` can be used in various ways.

For example, here is how you would add the Jupyter icon to the render tree of another React component:

```tsx
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
```

Alternatively, you can just render the icon directly into any existing DOM node `elem` by using the `ReactDOM` module:

```typescript
ReactDOM.render(jupyterIcon.react, elem);
```

If do you use `ReactDOM` to render, and if the `elem` node is ever removed from the DOM, you'll first need to clean it up:

```typescript
ReactDOM.unmountComponentAtNode(elem);
```

This cleanup step is not a special property of `LabIcon`, but is instead needed for any React component that is rendered directly at the top level by `ReactDOM`: failure to call `unmountComponentAtNode` can result in a [memory leak](https://stackoverflow.com/a/48198011/425458).

## How to create your own custom `LabIcon`

You can create your own custom icon by constructing a new instance of `LabIcon`:

```typescript
export const fooIcon = new LabIcon({
  name: 'barpkg:foo',
  svgstr: '<svg>...</svg>'
});
```

where `name` should be of the form "your-pkg:icon-name", and `svgstr` is the raw contents of your icon's svg file.

## How to create a new `LabIcon` from an external svg file

Although you can copy-and-paste an svg directly into the `LabIcon` constructor, the best practice is to keep the svg for each of your icons in its own separate svg file. You will need to have an `svg.d.ts` file at the root of your project's `src` directory:

```typescript
// svg.d.ts

declare module '*.svg' {
  const value: string;
  export default value;
}
```

You can then `import` the contents of an svg file:

```typescript
import fooSvgstr from 'path-to-your/foo.svg';

export const fooIcon = new LabIcon({ name: 'barpkg:foo', svgstr: fooSvgstr });
```
