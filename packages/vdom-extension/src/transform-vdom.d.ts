// Type definitions for @nteract/transform-vdom v1.1.1
// https://github.com/jupyterlab/jupyter-renderers
// Definitions by: Grant Nestor <https://github.com/gnestor>


declare module '@nteract/transform-vdom' {

  import * as React from 'react';

  interface IVDOMElement {
    tagName: 'string';
    attributes: Object;
    children: Array<IVDOMElement>;
    key?: number | string | null;
  }

  interface IVDOMProps extends React.Props<VDOM> {
    data: IVDOMElement;
  }

  export default class VDOM extends React.Component<IVDOMProps, {}> { }

}
