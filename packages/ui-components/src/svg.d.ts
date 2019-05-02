// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// for use with raw-loader in webpack
declare module '*.svg' {
  const value: string;
  export default value;
}

// for use with svg-react-loader in webpack
// declare module '*.svg' {
//   import { HTMLAttributes } from 'react';
//   const value: React.ComponentType<HTMLAttributes<SVGElement>>;
//   export default value;
// }
