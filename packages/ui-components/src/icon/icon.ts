import { nameFromPath } from '../utils';

/**
 * `require.context` polyfill for jest tests.
 * Modified from https://stackoverflow.com/a/42191018/425458.
 */
// This condition actually should detect if it's an Node environment
if (typeof require.context === 'undefined') {
  const fs = require('fs');
  const path = require('path');

  require.context = (base: string, deep?: boolean, filter?: RegExp): any => {
    const files: { [key: string]: boolean } = Object.create(null);

    function readDirectory(directory: string) {
      fs.readdirSync(directory).forEach((file: string) => {
        const fullPath = path.resolve(directory, file);

        if (fs.statSync(fullPath).isDirectory()) {
          if (deep) readDirectory(fullPath);

          return;
        }

        if (!filter.test(fullPath)) return;

        files[fullPath] = true;
      });
    }

    readDirectory(path.resolve(__dirname, base));

    function Module(file: string) {
      return require(file);
    }

    Module.keys = () => Object.keys(files);

    return Module;
  };
}

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

  export const defaultIcons: ReadonlyArray<IModel> = importSvgs(
    require.context('raw-loader!../../style/icons', true, /\.svg$/)
  );

  export interface IModel {
    name: string;
    className?: string;
    svg: string;
  }
}
