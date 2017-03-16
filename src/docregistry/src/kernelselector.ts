// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, Session
} from '@jupyterlab/services';

import {
  IterableOrArrayLike, each
} from '@phosphor/algorithm';

import {
  Widget
} from '@phosphor/widgets';

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  DocumentRegistry
} from './registry';


/**
 * An interface for selecting a new kernel.
 */
export
interface IKernelSelection {
  /**
   * The name of the current session.
   */
  name: string;

  /**
   * The kernel spec information.
   */
  specs: Kernel.ISpecModels;

  /**
   * The current running sessions.
   */
  sessions: IterableOrArrayLike<Session.IModel>;

  /**
   * The desired kernel language.
   */
  preferredLanguage: string;

  /**
   * The optional existing kernel model.
   */
  kernel?: Kernel.IModel;

  /**
   * The host widget to be selected after the dialog is shown.
   */
  host?: Widget;
}


/**
 * An interface for populating a kernel selector.
 */
export
interface IPopulateOptions {
   /**
    * The Kernel specs.
    */
  specs: Kernel.ISpecModels;

  /**
   * The current running sessions.
   */
  sessions: IterableOrArrayLike<Session.IModel>;

  /**
   * The optional existing kernel model.
   */
  kernel?: Kernel.IModel;

  /**
   * The preferred kernel name.
   */
  preferredKernel?: string;

  /**
   * The preferred kernel language.
   */
  preferredLanguage?: string;
}


/**
 * Bring up a dialog to select a kernel.
 */
export
function selectKernel(options: IKernelSelection): Promise<Kernel.IModel> {
  let { specs, kernel, sessions, preferredLanguage } = options;

  // Create the dialog body.
  let body = document.createElement('div');
  let text = document.createElement('label');
  text.innerHTML = `Select kernel for: "${options.name}"`;
  body.appendChild(text);

  let selector = document.createElement('select');
  body.appendChild(selector);

  // Get the current sessions, populate the kernels, and show the dialog.
  populateKernels(selector, { specs, sessions, preferredLanguage, kernel });
  let select = Dialog.okButton({ label: 'SELECT' });
  return showDialog({
    title: 'Select Kernel',
    body,
    buttons: [Dialog.cancelButton(), select]
  }).then(result => {
    // Change the kernel if a kernel was selected.
    if (result.accept) {
      return JSON.parse(selector.value) as Kernel.IModel;
    }
    return void 0;
  });
}


/**
 * Change the kernel on a context.
 */
export
function selectKernelForContext(context: DocumentRegistry.Context, manager: Session.IManager, host?: Widget): Promise<void> {
  return manager.ready.then(() => {
    let options: IKernelSelection = {
      name: context.path.split('/').pop(),
      specs: manager.specs,
      sessions: manager.running(),
      preferredLanguage: context.model.defaultKernelLanguage,
      kernel: context.kernel ? context.kernel.model : null,
    };
    return selectKernel(options);
  }).then(kernel => {
    if (host) {
      host.activate();
    }
    if (kernel && (kernel.id || kernel.name)) {
      context.changeKernel(kernel);
    } else if (kernel && !kernel.id && !kernel.name) {
      context.changeKernel();
    }
  });
}


/**
 * Get the appropriate kernel name.
 */
export
function findKernel(kernelName: string, language: string, specs: Kernel.ISpecModels): string {
  if (kernelName === 'unknown') {
    return specs.default;
  }
  // Look for an exact match.
  for (let specName in specs.kernelspecs) {
    if (specName === kernelName) {
      return kernelName;
    }
  }
  // Next try to match the language name.
  if (language === 'unknown') {
    return specs.default;
  }
  for (let specName in specs.kernelspecs) {
    let kernelLanguage = specs.kernelspecs[specName].language;
    if (language === kernelLanguage) {
      console.log('No exact match found for ' + specName +
                  ', using kernel ' + specName + ' that matches ' +
                  'language=' + language);
      return specName;
    }
  }
  // Finally, use the default kernel.
  if (kernelName) {
    console.log(`No matching kernel found for ${kernelName}, ` +
              `using default kernel ${specs.default}`);
  }
  return specs.default;
}


/**
 * Populate a kernel dropdown list.
 *
 * @param node - The host node.
 *
 * @param options - The options used to populate the kernels.
 *
 * #### Notes
 * Populates the list with separated sections:
 *   - Kernels matching the preferred language (display names).
 *   - "None" signifying no kernel.
 *   - The remaining kernels.
 *   - Sessions matching the preferred language (file names).
 *   - The remaining sessions.
 * If no preferred language is given or no kernels are found using
 * the preferred language, the default kernel is used in the first
 * section.  Kernels are sorted by display name.  Sessions display the
 * base name of the file with an ellipsis overflow and a tooltip with
 * the explicit session information.
 */
export
function populateKernels(node: HTMLSelectElement, options: IPopulateOptions): void {
  // Clear any existing options.
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
  let maxLength = 10;

  let { preferredKernel, preferredLanguage, sessions, specs, kernel } = options;
  let existing = kernel ? kernel.id : void 0;

  // Create mappings of display names and languages for kernel name.
  let displayNames: { [key: string]: string } = Object.create(null);
  let languages: { [key: string]: string } = Object.create(null);
  for (let name in specs.kernelspecs) {
    let spec = specs.kernelspecs[name];
    displayNames[name] = spec.display_name;
    maxLength = Math.max(maxLength, displayNames[name].length);
    languages[name] = spec.language;
  }

  // Handle a kernel by name.
  let names: string[] = [];
  if (preferredKernel && preferredKernel in specs.kernelspecs) {
    names.push(name);
  }

  // Handle a preferred kernel language in order of display name.
  let preferred = document.createElement('optgroup');
  preferred.label = 'Start Preferred Kernel';

  if (preferredLanguage && specs) {
    for (let name in specs.kernelspecs) {
      if (languages[name] === preferredLanguage) {
        names.push(name);
      }
    }
    names.sort((a, b) => displayNames[a].localeCompare(displayNames[b]));
    for (let name of names) {
      preferred.appendChild(optionForName(name, displayNames[name]));
    }
  }
  // Use the default kernel if no preferred language or none were found.
  if (!names.length) {
    let name = specs.default;
    preferred.appendChild(optionForName(name, displayNames[name]));
  }
  if (preferred.firstChild) {
    node.appendChild(preferred);
  }

  // Add an option for no kernel
  node.appendChild(optionForNone());

  let other = document.createElement('optgroup');
  other.label = 'Start Other Kernel';

  // Add the rest of the kernel names in alphabetical order.
  let otherNames: string[] = [];
  for (let name in specs.kernelspecs) {
    if (names.indexOf(name) !== -1) {
      continue;
    }
    otherNames.push(name);
  }
  otherNames.sort((a, b) => displayNames[a].localeCompare(displayNames[b]));
  for (let name of otherNames) {
    other.appendChild(optionForName(name, displayNames[name]));
  }
  // Add a separator option if there were any other names.
  if (otherNames.length) {
    node.appendChild(other);
  }

  // Add the sessions using the preferred language first.
  let matchingSessions: Session.IModel[] = [];
  let otherSessions: Session.IModel[] = [];

  each(sessions, session => {
    if (preferredLanguage &&
        languages[session.kernel.name] === preferredLanguage &&
        session.kernel.id !== existing) {
      matchingSessions.push(session);
    } else if (session.kernel.id !== existing) {
      otherSessions.push(session);
    }
  });

  let matching = document.createElement('optgroup');
  matching.label = 'Use Kernel from Preferred Session';
  node.appendChild(matching);

  if (matchingSessions.length) {
    matchingSessions.sort((a, b) => {
      return a.notebook.path.localeCompare(b.notebook.path);
    });

    each(matchingSessions, session => {
      let name = displayNames[session.kernel.name];
      matching.appendChild(optionForSession(session, name, maxLength));
    });

  }

  let otherSessionsNode = document.createElement('optgroup');
  otherSessionsNode.label = 'Use Kernel from Other Session';
  node.appendChild(otherSessionsNode);

  if (otherSessions.length) {
    otherSessions.sort((a, b) => {
      return a.notebook.path.localeCompare(b.notebook.path);
    });

    each(otherSessions, session => {
      let name = displayNames[session.kernel.name] || session.kernel.name;
      otherSessionsNode.appendChild(optionForSession(session, name, maxLength));
    });
  }
  node.selectedIndex = 0;
}

/**
 * Create an option element for a kernel name.
 */
function optionForName(name: string, displayName: string): HTMLOptionElement {
  let option = document.createElement('option');
  option.text = displayName;
  option.value = JSON.stringify({ name });
  return option;
}

/**
 * Create an option for no kernel.
 */
function optionForNone(): HTMLOptGroupElement {
  let group = document.createElement('optgroup');
  group.label = 'Use No Kernel';
  let option = document.createElement('option');
  option.text = 'No Kernel';
  option.value = JSON.stringify({id: null, name: null});
  group.appendChild(option);
  return group;
}

/**
 * Create an option element for a session.
 */
function optionForSession(session: Session.IModel, displayName: string, maxLength: number): HTMLOptionElement {
  let option = document.createElement('option');
  let sessionName = session.notebook.path.split('/').pop();
  const CONSOLE_REGEX = /^console-(\d)+-[0-9a-f]+$/;
  if (CONSOLE_REGEX.test(sessionName)) {
    sessionName = `Console ${sessionName.match(CONSOLE_REGEX)[1]}`;
  }
  if (sessionName.length > maxLength) {
    sessionName = sessionName.slice(0, maxLength - 3) + '...';
  }
  option.text = sessionName;
  option.value = JSON.stringify({ id: session.kernel.id });
  option.title = `Path: ${session.notebook.path}\n` +
    `Kernel Name: ${displayName}\n` +
    `Kernel Id: ${session.kernel.id}`;
  return option;
}
