// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { KernelManager } from './manager';
import { Kernel } from './kernel';
import { Signal, ISignal } from '@phosphor/signaling';
import { UUID } from '@phosphor/coreutils';

/**
 * An arguments object for the kernel changed signal.
 */
export interface IKernelChangedArgs {
  /**
   * The old kernel.
   */
  oldValue: Kernel.IKernelConnection | null;
  /**
   * The new kernel.
   */
  newValue: Kernel.IKernelConnection | null;
}

/**
 * A kernel preference.
 *
 * Kernels are ordered by matching id, then name, then language.
 */
export interface IKernelPreference {
  /**
   * The id of an existing kernel.
   */
  id?: string;

  /**
   * The preferred kernel language.
   */
  language?: string;

  /**
   * The name of the kernel.
   */
  name?: string;

  /*
   * Use server default as a last resort.
   */
  serverDefault: boolean;
}

/**
 * Options for the change kernel function
 */
export interface IChangeKernelOptions {
  /**
   * A function to call if we want confirmation *if* we are stopping a kernel.
   */
  confirm?: () => Promise<boolean>;

  /**
   * A function to call to select the new kernel.
   *
   * This function should somehow let a user narrow a preference down, given the
   * list of kernel specs and existing kernels, etc. For example, an initial
   * preference might be just a language, and the returned preference might be a
   * specific id to connect to.
   *
   * Restarting a kernel might just return an id, then the name of the previous kernel.
   */
  select?: (
    pref: IKernelPreference,
    manager: KernelManager
  ) => Promise<IKernelPreference>;

  /**
   * Optional IKernelPreference to use instead of the built-in one (should we even have a built-in one?)
   */
  kernelPreference?: IKernelPreference;
}

/**
 * An interface for populating a kernel selector.
 */
export interface IKernelSearch {
  /**
   * The Kernel specs.
   */
  specs: Kernel.ISpecModels | null;

  /**
   * The kernel preference.
   */
  preference: IKernelPreference;
}
// TODO: create a registry of kernel resources, keyed by id. Activities should
// save which kernel resource id they are attached to.

/**
 * This differs from a session in that it:
 * 1. Is not associated with a path.
 * 2. Has no server-side component.
 * 3. Exists beyond one kernel's lifecycle.
 *
 * A resource "owns" a kernel (maybe in the future a resource can point to another resource?).
 *
 * TODO:
 * [ ] Create "running" side panel for kernel resources
 * [ ] Create some way of persisting state, so that a refresh can reconstitute the state
 * [ ] Figure out better name. Engine?
 */
export class KernelResource {
  constructor(manager: KernelManager, id?: string) {
    this._kernelManager = manager;
    this.id = id || UUID.uuid4();
  }

  get kernel(): Kernel.IKernel | null {
    return this._kernel;
  }

  /**
   * A signal emitted when the kernel changes.
   *
   * Emits only on an actual kernel object changes (e.g., when change, not when
   * a kernel is restarted, but has the same kernel id.
   */
  get kernelChanged(): ISignal<this, IKernelChangedArgs> {
    return this._kernelChanged;
  }

  /**
   * Cases for changing the kernel:
   *
   * 1. Starting a new kernel for the first time.
   *   * preferences for a new kernel:
   *     - id, for connecting to an existing kernel
   *     - name, for starting a new specific kernel
   *     - language, for starting a default kernel with a specific language
   * 2. Restarting an existing kernel
   *   * restart the same name of kernel as we had before
   * 3. Ask the user to select:
   *   * Choose no kernel.
   *   * Choose between the kernelspecs, listed in preferred order.
   *   * Choose between existing kernel resources.
   *
   * If we are stopping a kernel, call some function for user confirmation, which defaults to true.
   *
   * Subclasses can implement the user confirmation a different way.
   */

  /**
   * Change the kernel.
   *
   * @param preference - a list of preferences for choosing a kernel.
   *
   * @returns A promise that resolves to true if the kernel is changed, false otherwise
   *
   * #### Notes
   *
   */
  async changeKernel({
    confirm,
    select,
    kernelPreference
  }: IChangeKernelOptions = {}): Promise<boolean> {
    // The confirmation should happen only if we *know* we are going to switch
    // kernels, or before any possible user selection. If we are in the case
    // where we are going to fail an automatic kernel selection (say we can't
    // find the new kernel, don't confirm). On the other hand, perhaps we should
    // confirm right away, and guarantee that at the end of this function, the
    // existing kernel is shut down, i.e., the kernel will be null or the new
    // kernel.

    // A special case is if the kernel we want to select is the same kernel as
    // we are (i.e., the id we select is the same as the id we are). In this
    // case, do we expect the kernel to be restarted?
    if (this._kernel && confirm) {
      let proceed = await confirm();
      if (proceed) {
        await this._kernel.shutdown();
      } else {
        return false;
      }
    }

    kernelPreference = kernelPreference || this.kernelPreference;
    if (select) {
      kernelPreference = await select(kernelPreference, this._kernelManager);
    }
    // Use the kernel preference to pick the kernel to launch.
    const { id } = kernelPreference;

    if (id) {
      const model = await this._kernelManager.findById(id);
      if (model) {
        await this._replaceKernel(this._kernelManager.connectTo(model));
        return true;
      }
    }
    const specName = this._getDefaultKernelName({
      specs: this._kernelManager.specs,
      preference: kernelPreference
    });
    if (specName) {
      try {
        const kernel = await this._kernelManager.startNew({ name });
        await this._replaceKernel(kernel);
        return true;
      } catch (e) {
        // no-op
      }
    }
    return false;
  }

  /**
   * Get the default kernel name given preference, or undefined if no suitable kernel name is found.
   */
  private _getDefaultKernelName(options: IKernelSearch): string | null {
    const { specs, preference } = options;
    const { name, language, serverDefault } = preference;
    const kernelspecs = specs.kernelspecs;

    const defaultName = serverDefault ? specs.default : undefined;

    // Shortcut return for a common case.
    if (!name && !language) {
      return defaultName;
    }

    // If we have an exact kernelspec name match, return it.
    if (kernelspecs[name]) {
      return name;
    }

    // Use the final default if there is no language, or if there is a final default and it is the right language.
    if (
      !language ||
      (defaultName && kernelspecs[defaultName].language === language)
    ) {
      if (name && defaultName) {
        console.log(
          `No exact match found for kernel ${name}, using server default kernel ${defaultName} with language ${
            kernelspecs[defaultName].language
          }`
        );
      }
      return defaultName;
    }

    // Otherwise, just pick a kernel name that has the right language. Sort the
    // names so this is deterministic.
    const specName = Object.keys(kernelspecs)
      .sort()
      .find(s => kernelspecs[s].language === language);
    if (specName) {
      if (name) {
        console.log(
          `No exact match found for kernel ${name}, using kernel ${specName} with language ${
            kernelspecs[specName].language
          }`
        );
      }
      return specName;
    }

    if (name && defaultName) {
      console.log(
        `No exact match found for kernel ${name}, using kernel ${defaultName} with language ${
          kernelspecs[defaultName].language
        }`
      );
    }
    return defaultName;
  }

  private async _replaceKernel(newValue: Kernel.IKernel): Promise<void> {
    let oldValue = this._kernel;
    this._kernel = newValue;
    this._kernelChanged.emit({ oldValue, newValue });
    await oldValue.shutdown();

    // Reset the default kernel preference so that it is easy to restart a dead
    // kernel.
    this.kernelPreference.name = newValue.name;
    delete this.kernelPreference.id;
  }

  /**
   * The kernel preference.
   */
  kernelPreference: IKernelPreference;

  /**
   * The display name of the kernel.
   */
  readonly kernelDisplayName: string;

  /**
   * Restart the session.
   *
   * @returns A promise that resolves with whether the kernel has restarted.
   *
   * #### Notes
   * If kernel state would be lost (running kernel), call an async for confirmation.
   * If there is a running kernel, call the restartOkay for confirmation.
   * If there is no kernel, start kernel with last run kernel name.
   * If kernel has never been run, resolve with `false`.
   */
  async restart(): Promise<boolean> {
    // TODO
    return false;
  }

  readonly id: string;

  private _kernelManager: KernelManager;
  private _kernel: Kernel.IKernel | null;
  private _kernelChanged = new Signal<this, IKernelChangedArgs>(this);
}
