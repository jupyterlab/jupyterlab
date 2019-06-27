import { nameFromPath } from '../utils';

export namespace Icon {
  // /**
  //  * Import all svgs from a directory. The input argument should be
  //  * of the form `require.context('raw-loader!<path>', true, /\.svg$/)`.
  //  * <path> should be a string literal path, as this is needed by `require`.
  //  */
  // export function importSvgs(r: any): ReadonlyArray<IModel> {
  //   return r.keys().reduce((svgs: IModel[], item: string, index: number) => {
  //     const name = nameFromPath(item);
  //     if (name !== 'bad') {
  //       svgs.push({ name: name, svg: r(item).default });
  //     }
  //     return svgs;
  //   }, []);
  // }

  // export function svgSource(): any {
  //   if (typeof require.context !== 'undefined') {
  //     // webpack
  //     return require.context('raw-loader!../../style/icons', true, /\.svg$/);
  //   } else {
  //     // other
  //     return import('require-directory').then(requireDirectory => {
  //       return requireDirectory(module, 'raw-loader!../../style/icons', {extensions: ['svg'], recurse: true});
  //     });
  //   }
  // }

  // export function svgSource(): any {
  //   if (typeof require.context !== 'undefined') {
  //     // webpack
  //     return require.context('raw-loader!../../style/icons', true, /\.svg$/);
  //   } else {
  //     // other
  //     return {};
  //     // let requireDirectory = require('require-directory');
  //     // return requireDirectory(module, 'raw-loader!../../style/icons', {extensions: ['svg'], recurse: true});
  //   }
  // }
  //
  // export const defaultIcons: ReadonlyArray<IModel> = importSvgs(svgSource());

  // We could just use Webpack's builtin require.context instead,
  // but unfortunately it breaks the jest tests (since that's a `node` environment)
  // export const defaultIcons: ReadonlyArray<IModel> = importSvgs(
  //   require.context('raw-loader!../../style/icons', true, /\.svg$/)
  // );

  export interface IModel {
    name: string;
    className?: string;
    svg: string;
  }

  /**
   * The dynamic import stuff is webpack only and breaks Jest,
   * so it's turned off for now
   */

  /**
   * Import all svgs from a directory. The input argument should be
   * of the form `require.context('raw-loader!<path>', true, /\.svg$/)`.
   * <path> should be a string literal path, as this is needed by `require`.
   */
  export function importSvgs(r: any): IModel[] {
    return r.keys().reduce((svgs: IModel[], item: string, index: number) => {
      const name = nameFromPath(item);
      if (name !== 'bad') {
        svgs.push({ name: name, svg: r(item).default });
      }
      return svgs;
    }, []);
  }

  let icons: IModel[];
  try {
    icons = importSvgs(
      require.context('raw-loader!../../style/icons', true, /\.svg$/)
    );
  } catch (e) {
    icons = [];
  }

  export const defaultIcons: ReadonlyArray<IModel> = icons;
}
