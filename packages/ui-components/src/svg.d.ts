// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// including this file in a package allows for the use of import statements
// with svg files. Example: `import xSvg from 'path/xSvg.svg'`

// for use with raw-loader in Webpack.
// The svg will be imported as a raw string

declare module '*.svg' {
  const value: string; // @ts-ignore
  export default value;
}

// for use with svg-react-loader in Webpack.
// The svg will be imported as a ReactElement

// declare module '*.svg' {
//   import { HTMLAttributes } from 'react';
//   const value: React.ComponentType<HTMLAttributes<SVGElement>>;
//   export default value;
// }

// as an alternative to importing svgs one at a time, you can do a glob import
// using `context.requires`. This is a Webpack only extension. Implementation:

// import { PathExt } from '@jupyterlab/coreutils';
//
// /**
//  * Import all svgs from a directory. The input argument should be
//  * of the form `require.context('raw-loader!<path>', true, /\.svg$/)`.
//  * <path> should be a string literal path, as this is needed by `require`.
//  */
// export function importSvgs(r: any, exclude: string[] = []): IModel[] {
//   const excset = new Set(exclude);
//
//   return r.keys().reduce((svgs: IModel[], item: string, index: number) => {
//     const name = PathExt.stem(item);
//     if (!excset.has(name)) {
//       svgs.push({ name: name, svg: r(item).default });
//     }
//     return svgs;
//   }, []);
// }
//
// // create the array of default icon models
// let icons: IModel[];
// try {
//   // require.context is supplied by Webpack, and doesn't play nice with jest
//   icons = importSvgs(
//     require.context('raw-loader!../../style/icons', true, /\.svg$/),
//     ['bad', 'blank']
//   );
// } catch (e) {
//   // fallback for jest tests
//   icons = [];
// }
// export const defaultIcons: ReadonlyArray<IModel> = icons;
