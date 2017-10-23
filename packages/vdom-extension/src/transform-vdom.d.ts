// Type definitions for @nteract/transform-vdom v1.1.1
// https://github.com/jupyterlab/jupyter-renderers
// Definitions by: Grant Nestor <https://github.com/gnestor>


declare module '@nteract/transform-vdom' {
  
  import * as React from 'react';

  interface VDOMElement {
    tagName: 'string';
    attributes: Object;
    children: Array<VDOMElement>;
    key?: number | string | null;
  }

  interface VDOMProps extends React.Props<VDOM> {
    data: VDOMElement;
  }

  export default class VDOM extends React.Component<VDOMProps, {}> { }
  
}
