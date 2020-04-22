// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';

import * as React from 'react';

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

// Mapping of manager name to function that take name and gives command
const managerCommand: { [key: string]: (name: string) => string } = {
  pip: name => `pip install ${name}`,
  conda: name => `conda install -c conda-forge ${name}`
};

function getInstallCommands(info: IInstallInfo) {
  const commands = Array<string>();
  for (const manager of info.managers) {
    const name = info.overrides?.[manager]?.name ?? info.base.name;
    if (!name) {
      console.warn(`No package name found for manager ${manager}`);
      continue;
    }
    const command = managerCommand[manager]?.(name);
    if (!command) {
      console.warn(`Don't know how to install packages for manager ${manager}`);
    }
    commands.push(command);
  }
  return commands;
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
  const entries = [];
  if (serverCompanion) {
    entries.push(
      <p key="server-companion">
        This package has indicated that it needs a corresponding server
        extension. Please contact your Administrator to update the server with
        one of the following commands:
        {getInstallCommands(serverCompanion).map(command => {
          return (
            <p key={command}>
              <code>{command}</code>
            </p>
          );
        })}
      </p>
    );
  }
  if (kernelCompanions.length > 0) {
    entries.push(
      <p key={'kernel-companion'}>
        This package has indicated that it needs a corresponding package for the
        kernel.
      </p>
    );
    for (const [index, entry] of kernelCompanions.entries()) {
      entries.push(
        <p key={`companion-${index}`}>
          The package
          <code>{entry.kernelInfo.base.name!}</code>, is required by the
          following kernels:
        </p>
      );
      const kernelEntries = [];
      for (const [index, kernel] of entry.kernels.entries()) {
        kernelEntries.push(
          <li key={`kernels-${index}`}>
            <code>{kernel.display_name}</code>
          </li>
        );
      }
      entries.push(<ul key={'kernel-companion-end'}>{kernelEntries}</ul>);
      entries.push(
        <p key={`kernel-companion-${index}`}>
          This package has indicated that it needs a corresponding kernel
          package. Please contact your Administrator to update the server with
          one of the following commands:
          {getInstallCommands(entry.kernelInfo).map(command => {
            return (
              <p key={command}>
                <code>{command}</code>
              </p>
            );
          })}
        </p>
      );
    }
  }
  const body = (
    <div>
      {entries}
      <p>
        You should make sure that the indicated packages are installed before
        trying to use the extension. Do you want to continue with the extension
        installation?
      </p>
    </div>
  );
  const hasKernelCompanions = kernelCompanions.length > 0;
  const hasServerCompanion = !!serverCompanion;
  let title = '';
  if (hasKernelCompanions && hasServerCompanion) {
    title = 'Kernel and Server Companions';
  } else if (hasKernelCompanions) {
    title = 'Kernel Companions';
  } else {
    title = 'Server Companion';
  }
  return showDialog({
    title,
    body,
    buttons: [
      Dialog.cancelButton(),
      Dialog.okButton({
        label: 'OK',
        caption: 'Install the JupyterLab extension.'
      })
    ]
  }).then(result => {
    return result.button.accept;
  });
}
