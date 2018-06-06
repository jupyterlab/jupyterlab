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
  let prompt: string;
  if (kernelCompanions && serverCompanion) {
    prompt = 'Install Companions';
  } else if (kernelCompanions) {
    prompt = 'Install in Kernel';
  } else {
    prompt = 'Install Server Ext';
  }
  return showDialog({
    title: 'Kernel companions',
    body,
    buttons: [
      Dialog.cancelButton(),
      Dialog.warnButton({
        label: prompt,
        caption: 'Try to install the package into the selected kernels.'
      }),
      Dialog.okButton({
        label: 'Install Ext Only',
        caption: 'Install the Jupyterlab extension.',
      })
    ]
  }).then(result => {
    if (result.button.label === prompt) {
      return promptInstallCompanions(kernelCompanions, serverCompanion, serviceManager);
    }
    return result.button.label === 'Install Ext Only';
  });
}


/**
 * Prompt the user what do about companion packages, if present
 *
 * @param builder the build manager
 */
export
function promptInstallCompanions(kernelCompanions: KernelCompanion[],
                                 serverCompanion: IInstallInfo | undefined,
                                 serviceManager: ServiceManager): Promise<boolean> {
  // VDOM entries to put in dialog:
  let entries = [];
  // Config (model) to be filled by dialog:
  let config: {
    [key: string]: {
      kernelInfo: IKernelInstallInfo,
      manager: string,
      selected: {
        [key: string]: Kernel.ISpecModel;
      }
    }
  } = {};
  for (let entry of kernelCompanions) {
    let lookupName = entry.kernelInfo.base.name!;
    let kernelEntries = [];
    // Create initial config:
    config[lookupName] = {
      kernelInfo: entry.kernelInfo,
      manager: entry.kernelInfo.managers[0] || '',
      selected: {},
    };
    for (let kernel of entry.kernels) {
      // For each entry, create a checkbox:
      kernelEntries.push(
        (<label>
          <input type='checkbox' value={kernel.name} onChange={() => {
            // Have checkbox toggle modify config:
            let selected = config[lookupName].selected;
            if (kernel.name in selected) {
              delete selected[kernel.name];
            } else {
              selected[kernel.name] = kernel;
            }
          }} />
          {kernel.display_name}
        </label>),
        <br/>
      );
    }
    // Add select for picking which package panager to use
    let managerOptions = [];
    for (let m of entry.kernelInfo.managers || []) {
      managerOptions.push(<option value={m}>{m}</option>);
    }
    entries.push(
      <div>
        {entry.kernelInfo.base.name!}
        <select onChange={
          (event) => {
            config[lookupName].manager = (event.target as HTMLSelectElement).value;
          }
        }>
        {...managerOptions}
        </select>
        {...kernelEntries}
      </div>
    );
  }
  let serverEntries = [];
  let serverManager = '';
  if (serverCompanion) {
    // Add select for picking which package manager to use
    let managerOptions = [];
    serverManager = serverCompanion.managers[0] || '';
    for (let m of serverCompanion.managers || []) {
      managerOptions.push(<option value={m}>{m}</option>);
    }
    managerOptions.push(<option value='-- Do nothing --'/>);
    serverEntries.push(
      <p>
      Server extension install
      <code>{serverCompanion.base.name!}</code>
      <select onChange={(event) => {
            serverManager = (event.target as HTMLSelectElement).value;
          }
        }>
        {...managerOptions}
      </select>
      </p>
    );
  }
  let body = (<div>
    {...serverEntries}
    <p>Which kernel(s) do you want to install into?</p>
    {...entries}
    </div>
  );
  let dialogPromise = showDialog({
    title: 'Install kernel companions',
    body,
    buttons: [
      Dialog.cancelButton(),
      Dialog.warnButton({ label: 'Install' })],
  });

  let installPromise = dialogPromise.then((result) => {
    if (!result.button.accept) {
      return;
    }
    // Start launching kernels, build commands, and send commands
    for (let key of Object.keys(config)) {
      let c = config[key];
      for (let kernelName of Object.keys(c.selected)) {
        let spec = c.selected[kernelName];
        serviceManager.sessions.startNew({
          path: uuid(16),
          kernelName: spec.name,
        }).then((session) => {
          let kernel = session.kernel;
          let override = {};
          if (c.kernelInfo.overrides && c.manager in c.kernelInfo.overrides) {
            override = c.kernelInfo.overrides[c.manager]!;
          }
          let info = {
            ...c.kernelInfo.base,
            ...override,
          };
          installOnKernel(kernel, c.manager, info).then(() => {
            session.shutdown();
          });
        });
      }
    }

    if (serverCompanion) {
      serviceManager.terminals.startNew().then((terminal) => {
        let override = {};
        if (serverCompanion.overrides && serverManager in serverCompanion.overrides) {
          override = serverCompanion.overrides[serverManager]!;
        }
        let info = {
          ...serverCompanion.base,
          ...override,
        };
        installOnServer(terminal, serverManager, info).catch(() => {
          terminal.shutdown();
        });
      });
    }
  });

  return installPromise.then(() => {
    return dialogPromise;
  }).then((result) => {
    if (!result.button.accept) {
      return false;
    }
    // Loop over all configured actions, and see if any bundle JS
    let bundled = false;
    for (let key of Object.keys(config)) {
      let c = config[key];
      let override = {};
      if (c.kernelInfo.overrides && c.manager in c.kernelInfo.overrides) {
        override = c.kernelInfo.overrides[c.manager]!;
      }
      let info = {
        ...c.kernelInfo.base,
        ...override,
      };
      bundled = bundled || !!info.bundles_extension;
    }
    // If JS is bundled, prevent direct install of NPM package
    return !bundled;
  });
}


/**
 * Install a companion package on a kernel.
 *
 * @param kernel A kernel connection to the targeted kernel.
 * @param manager The package manager to use for installation.
 * @param info The install info of the companion package.
 */
function installOnKernel(kernel: Kernel.IKernelConnection, manager: string, info: IInstallInfoEntry): Promise<void> {
  let code: string | undefined;
  if (manager === 'pip') {
    code = `
import sys
from subprocess import check_call
check_call([sys.executable, '-m', 'pip', 'install', '${info.name}'])
`;

  } else if (manager === 'conda') {
    code = `
import sys
from subprocess import check_call
import os
pjoin = os.path.join
cmd_opt = ['install', '--prefix', sys.prefix, '--yes', '--quiet', '${info.name}']
try:
    check_call([pjoin(sys.prefix, 'bin', 'conda')] + cmd_opt)
except FileNotFoundError:
    if os.name == 'nt':
        check_call([pjoin(sys.prefix, 'Scripts', 'conda')] + cmd_opt)
    else:
        raise
`;

  }
  if (code) {
    let future = kernel.requestExecute({
      code,
      stop_on_error: true
    });
    return (future.done as Promise<KernelMessage.IExecuteReplyMsg>).then(reply => {
      if (reply.content.status !== 'ok') {
        console.error('Error installing on kernel', reply);
        throw new Error(`Error installing on kernel:\n${reply.content.status}`);
      }
    });
  }
  return Promise.reject(`Unknown manager: ${manager}`);
}


/**
 * Install a companion server extension package.
 *
 * @param terminal A terminal session to the server.
 * @param manager The package manager to use for installation.
 * @param info The install info of the companion package.
 */
function installOnServer(terminal: TerminalSession.ISession,
                         manager: string,
                         info: IInstallInfoEntry): Promise<void> {
  let cmd = '';
  if (manager === 'pip') {
    cmd += `pip install ${info.name}`;
  } else if (manager === 'conda') {
    cmd += `conda install --yes --quiet ${info.name}`;
  }
  cmd += '\r';

  return new Promise((resolve) => {
    // let output = '';
    const onMessage = function(session: TerminalSession.ISession, msg: TerminalSession.IMessage) {
      switch (msg.type) {
      case 'stdout':
        if (msg.content) {
          // output += msg.content[0];
        }
        break;
      case 'disconnect':
        session.messageReceived.disconnect(onMessage);
        // Process output?
        resolve();
        break;
      default:
        break;
      }
    };
    terminal.ready.then(() => {
      terminal.messageReceived.connect(onMessage);

      terminal.send({
        type: 'stdin',
        content: [cmd]
      });

      terminal.send({
        type: 'stdin',
        content: ['exit\r']
      });
    });
  });

}
