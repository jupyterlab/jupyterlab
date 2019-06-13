import { nameFromPath } from '../utils';

export namespace Icon {
  /**
   * Import all svgs from a directory. The input argument should be
   * of the form `require.context('raw-loader!<path>', true, /\.svg$/)`.
   * <path> should be a string literal path, as this is needed by `require`.
   */
  export function importSvgs(r: any): ReadonlyArray<IModel> {
    return r.keys().reduce((svgs: IModel[], item: string, index: number) => {
      const name = nameFromPath(item);
      if (name !== 'bad') {
        svgs.push({ name: name, svg: r(item).default });
      }
      return svgs;
    }, []);
  }

  export const defaultIcons = importSvgs(
    require.context('raw-loader!../../style/icons', true, /\.svg$/)
  );

  export interface IModel {
    name: string;
    className?: string;
    svg: string;
  }
}
