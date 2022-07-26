// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { KernelSpec } from '@jupyterlab/services';

/**
 * An object representing a companion installation info.
 */
export interface IInstallInfoEntry {
  /**
   * The name of the companion package/module.
   */
  name?: string;

  /**
   * Whether the package also includes the lab extension.
   */
  bundles_extension?: boolean;
}

/**
 * An object representing a server extension install info.
 */
export interface IInstallInfo {
  /**
   * The base/default install info.
   */
  base: IInstallInfoEntry;

  /**
   * Which package managers that have the package/module.
   */
  managers: string[];

  /**
   * Overrides of the base install info on a per-manager basis.
   */
  overrides?: { [key: string]: IInstallInfoEntry | undefined };
}

/**
 * An object representing a kernel companion install info.
 */
export interface IKernelInstallInfo extends IInstallInfo {
  /**
   * A specification of which kernels the current install info applies to.
   */
  kernel_spec: {
    /**
     * A regular expression for matching kernel language.
     */
    language: string;

    /**
     * A regular expression for matching kernel display name.
     */
    display_name?: string;
  };
}

/**
 * An object combining a kernel companion install info with matching specs.
 */
export type KernelCompanion = {
  /**
   * The kernel companion install info.
   */
  kernelInfo: IKernelInstallInfo;

  /**
   * The kernels that match the install info.
   */
  kernels: KernelSpec.ISpecModel[];
};

/**
 * An object representing the companion discovery metadata in package.json.
 */
export interface IJupyterLabPackageData {
  jupyterlab?: {
    discovery?: {
      /**
       * Information about any server extension companions.
       */
      server?: IInstallInfo;

      /**
       * Information about any kernel companions.
       */
      kernel?: IKernelInstallInfo[];
    };
  };
}

// TODO
// Mapping of manager name to function that take name and gives command
// const managerCommand: { [key: string]: (name: string) => string } = {
//   pip: name => `pip install ${name}`,
//   conda: name => `conda install -c conda-forge ${name}`
// };

// function getInstallCommands(info: IInstallInfo) {
//   const commands = Array<string>();
//   for (const manager of info.managers) {
//     const name = info.overrides?.[manager]?.name ?? info.base.name;
//     if (!name) {
//       console.warn(`No package name found for manager ${manager}`);
//       continue;
//     }
//     const command = managerCommand[manager]?.(name);
//     if (!command) {
//       console.warn(`Don't know how to install packages for manager ${manager}`);
//     }
//     commands.push(command);
//   }
//   return commands;
// }
