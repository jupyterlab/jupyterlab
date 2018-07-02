// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';

import { Kernel } from '@jupyterlab/services';

import * as React from 'react';

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
  kernels: Kernel.ISpecModel[];
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

/**
 * Prompt the user what do about companion packages, if present.
 *
 * @param builder the build manager
 */
export function presentCompanions(
  kernelCompanions: KernelCompanion[],
  serverCompanion: IInstallInfo | undefined
): Promise<boolean> {
  let entries = [];
  if (serverCompanion) {
    entries.push(
      <p>
        This package has indicated that it needs a corresponding server
        extension:
        <code> {serverCompanion.base.name!}</code>
      </p>
    );
  }
  if (kernelCompanions.length > 0) {
    entries.push(
      <p>
        This package has indicated that it needs a corresponding package for the
        kernel.
      </p>
    );
    for (let entry of kernelCompanions) {
      entries.push(
        <p>
          The package
          <code>{entry.kernelInfo.base.name!}</code>, is required by the
          following kernels:
        </p>
      );
      let kernelEntries = [];
      for (let kernel of entry.kernels) {
        kernelEntries.push(
          <li>
            <code>{kernel.display_name}</code>
          </li>
        );
      }
      entries.push(<ul>{kernelEntries}</ul>);
    }
  }
  let body = (
    <div>
      {entries}
      <p>
        You should make sure that the indicated packages are installed before
        trying to use the extension. Do you want to continue with the extension
        installation?
      </p>
    </div>
  );
  return showDialog({
    title: 'Kernel companions',
    body,
    buttons: [
      Dialog.cancelButton(),
      Dialog.okButton({
        label: 'OK',
        caption: 'Install the Jupyterlab extension.'
      })
    ]
  }).then(result => {
    return result.button.accept;
  });
}
