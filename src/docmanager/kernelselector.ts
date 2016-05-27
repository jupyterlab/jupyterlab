// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  ISessionId, IKernelId, IKernelSpecIds
} from 'jupyter-js-services';

import {
  showDialog
} from '../dialog';


/**
 * The options used to select a kernel.
 */
export
interface IKernelSelectOptions {
  /**
   * The host element for the dialog.
   */
  host: HTMLElement;

  /**
   * The path of the file.
   */
  path: string;

  /**
   * The kernel spec id information.
   */
  specs: IKernelSpecIds;

  /**
   * The list of running sessions.
   */
  running: ISessionId[];

  /**
   * The preferred kernel language.
   */
  preferredLanguage: string;

  /**
   * The optional existing kernel information.
   */
  existing: IKernelId;
}


/**
 * Bring up a dialog to select the kernel for a path.
 */
export
function selectKernel(options: IKernelSelectOptions): Promise<IKernelId> {
  let body = document.createElement('div');
  let text = document.createElement('pre');
  text.textContent = `Select kernel for "${options.path}"`;
  body.appendChild(text);
  if (options.existing !== void 0) {
    let name = options.existing.name;
    let displayName = options.specs.kernelspecs[name].spec.display_name;
    text.textContent += `\nCurrent: ${displayName}`;
    text.title = `Path: ${options.path}\n` +
    `Kernel Name: ${displayName}\n` +
    `Kernel Id: ${options.existing.id}`;
  }
  let selector = document.createElement('select');
  body.appendChild(selector);
  populateKernels(
    selector, options.specs, options.running, options.preferredLanguage
  );
  return showDialog({
    title: 'Select Kernel',
    body,
    host: options.host,
    okText: 'SELECT'
  }).then(result => {
    if (result.text === 'SELECT') {
      return JSON.parse(selector.value);
    }
    return void 0;
  });
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
 *   - The remaining kernels.
 *   - Sessions matching the preferred language (file names).
 *   - The remaining sessions.
 *   - "None" signifying no kernel.
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
  if (!names) {
    let name = specs.default;
    node.appendChild(optionForName(name, displayNames[name]));
  }
  // Add a separator.
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
    node.appendChild(createSeparatorOption(maxLength));
  }
  // Add the option to have no kernel.
  let option = document.createElement('option');
  option.text = 'None';
  option.value = 'null';
  node.appendChild(option);
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
