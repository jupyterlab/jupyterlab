// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISessionId, IKernelId, IKernelSpecIds
} from 'jupyter-js-services';

import {
  showDialog
} from '../dialog';

import {
  IDocumentContext, IDocumentModel
} from './interfaces';


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
  specs: IKernelSpecIds;

  /**
   * The current running sessions.
   */
  sessions: ISessionId[];

  /**
   * The desired kernel language.
   */
  preferredLanguage: string;

  /**
   * The optional existing kernel id.
   */
  kernel?: IKernelId;

  /**
   * The host node for the dialog.
   */
  host?: HTMLElement;
}


/**
 * Bring up a dialog to select a kernel.
 */
export
function selectKernel(options: IKernelSelection): Promise<IKernelId> {
  let specs = options.specs;
  let kernel = options.kernel;

  // Create the dialog body.
  let body = document.createElement('div');
  let text = document.createElement('pre');
  text.textContent = `Select kernel for\n"${options.name}"`;
  body.appendChild(text);
  if (kernel) {
    let displayName = specs.kernelspecs[kernel.name].spec.display_name;
    text.textContent += `\nCurrent: ${displayName}`;
    text.title = `Kernel Name: ${displayName}\n` +
    `Kernel Id: ${kernel.id}`;
  }
  let selector = document.createElement('select');
  body.appendChild(selector);

  // Get the current sessions, populate the kernels, and show the dialog.
  let lang = options.preferredLanguage;
  populateKernels(selector, specs, options.sessions, lang);
  return showDialog({
    title: 'Select Kernel',
    body,
    host: options.host,
    okText: 'SELECT'
  }).then(result => {
    // Change the kernel if a kernel was selected.
    if (result.text === 'SELECT') {
      return JSON.parse(selector.value) as IKernelId;
    }
    return void 0;
  });
}


/**
 * Change the kernel on a context.
 */
export
function selectKernelForContext(context: IDocumentContext<IDocumentModel>, host?: HTMLElement): Promise<void> {
  return context.listSessions().then(sessions => {
    let options = {
      name: context.path.split('/').pop(),
      specs: context.kernelspecs,
      sessions,
      preferredLanguage: context.model.defaultKernelLanguage,
      kernel: context.kernel,
      host
    };
    return selectKernel(options);
  }).then(kernel => {
    context.changeKernel(kernel);
  });
}


/**
 * Get the appropriate kernel name.
 */
export
function findKernel(kernelName: string, language: string, specs: IKernelSpecIds): string {
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
    let kernelLanguage = specs.kernelspecs[specName].spec.language;
    if (language === kernelLanguage) {
      console.log('No exact match found for ' + specName +
                  ', using kernel ' + specName + ' that matches ' +
                  'language=' + language);
      return specName;
    }
  }
  // Finally, use the default kernel.
  console.log(`No matching kernel found for ${kernelName}, ` +
              `using default kernel ${specs.default}`);
  return specs.default;
}


/**
 * Populate a kernel dropdown list.
 *
 * @param node - The host html element.
 *
 * @param specs - The available kernel spec information.
 *
 * @param running - The list of running session ids.
 *
 * @param preferredLanguage - The preferred language for the kernel.
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
function populateKernels(node: HTMLSelectElement, specs: IKernelSpecIds, running: ISessionId[], preferredLanguage?: string): void {
  // Clear any existing options.
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
  let maxLength = 10;
  // Create mappings of display names and languages for kernel name.
  let displayNames: { [key: string]: string } = Object.create(null);
  let languages: { [key: string]: string } = Object.create(null);
  for (let name in specs.kernelspecs) {
    displayNames[name] = specs.kernelspecs[name].spec.display_name;
    maxLength = Math.max(maxLength, displayNames[name].length);
    languages[name] = specs.kernelspecs[name].spec.language;
  }
  // Handle a preferred kernel language in order of display name.
  let names: string[] = [];
  if (preferredLanguage) {
    for (let name in specs.kernelspecs) {
      if (languages[name] === preferredLanguage) {
        names.push(name);
      }
    }
    names.sort((a, b) => displayNames[a].localeCompare(displayNames[b]));
    for (let name of names) {
      node.appendChild(optionForName(name, displayNames[name]));
    }
  }
  // Use the default kernel if no preferred language or none were found.
  if (!names.length) {
    let name = specs.default;
    node.appendChild(optionForName(name, displayNames[name]));
  }
  // Add a separator.
  node.appendChild(createSeparatorOption(maxLength));
  // Add the option to have no kernel.
  let option = document.createElement('option');
  option.text = 'None';
  option.value = 'null';
  node.appendChild(option);
  node.appendChild(createSeparatorOption(maxLength));
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
    node.appendChild(optionForName(name, displayNames[name]));
  }
  // Add a separator option if there were any other names.
  if (otherNames.length) {
    node.appendChild(createSeparatorOption(maxLength));
  }
  // Add the sessions using the preferred language first.
  let matchingSessions: ISessionId[] = [];
  if (preferredLanguage) {
    for (let session of running) {
      if (languages[session.kernel.name] === preferredLanguage) {
        matchingSessions.push(session);
      }
    }
    if (matchingSessions) {
      matchingSessions.sort((a, b) => {
        return a.notebook.path.localeCompare(b.notebook.path);
      });
      for (let session of matchingSessions) {
        let name = displayNames[session.kernel.name];
        node.appendChild(optionForSession(session, name, maxLength));
      }
      node.appendChild(createSeparatorOption(maxLength));
    }
  }
  // Add the other remaining sessions.
  let otherSessions: ISessionId[] = [];
  for (let session of running) {
    if (matchingSessions.indexOf(session) === -1) {
      otherSessions.push(session);
    }
  }
  if (otherSessions) {
    otherSessions.sort((a, b) => {
      return a.notebook.path.localeCompare(b.notebook.path);
    });
    for (let session of otherSessions) {
      let name = displayNames[session.kernel.name];
      node.appendChild(optionForSession(session, name, maxLength));
    }
  }
  node.selectedIndex = 0;
}


/**
 * Create a separator option.
 */
function createSeparatorOption(length: number): HTMLOptionElement {
  let option = document.createElement('option');
  option.disabled = true;
  option.text = Array(length).join('─');
  return option;
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
 * Create an option element for a session.
 */
function optionForSession(session: ISessionId, displayName: string, maxLength: number): HTMLOptionElement {
  let option = document.createElement('option');
  let sessionName = session.notebook.path.split('/').pop();
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
