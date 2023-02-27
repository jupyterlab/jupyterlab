/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { JupyterFrontEnd } from '@jupyterlab/application';
import { CommandRegistry } from '@lumino/commands';
import { Selector } from '@lumino/domutils';
import * as React from 'react';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { TranslationBundle } from '@jupyterlab/translation';

export function displayShortcuts(
  app: JupyterFrontEnd,
  trans: TranslationBundle,
  activeElement?: Element
) {
  const { commands } = app;
  const elt = activeElement ?? document.activeElement;

  /**
   * Find the distance from the target node to the first matching node.
   *
   * Based on Lumino private function commands.Private.targetDistance
   * This traverses the DOM path from `elt` to the root
   * computes the distance from `elt` to the first node which matches
   * the CSS selector. If no match is found, `-1` is returned.
   *
   * It also stops traversal if the `data-lm-suppress-shortcuts` or
   * `data-p-suppress-shortcuts` attributes are found.
   */
  function matchDistance(selector: string, elt: Element | null): number {
    let targ = elt;
    for (
      let dist = 0;
      targ !== null && targ !== targ.parentElement;
      targ = targ.parentElement, ++dist
    ) {
      if (targ.hasAttribute('data-lm-suppress-shortcuts')) {
        return -1;
      }
      if (targ.matches(selector)) {
        return dist;
      }
    }
    return -1;
  }

  // Find active keybindings for target element
  const activeBindings = new Map<
    string,
    [number, CommandRegistry.IKeyBinding]
  >();
  for (let i = 0; i < commands.keyBindings.length; i++) {
    const kb = commands.keyBindings[i];
    let distance = matchDistance(kb.selector, elt);
    if (distance < 0) {
      continue;
    }
    let formatted = CommandRegistry.formatKeystroke(kb.keys);
    if (activeBindings.has(formatted)) {
      let oldBinding = activeBindings.get(formatted)!;
      // if the existing binding takes precedence, ignore this binding by continuing
      if (
        oldBinding[0] < distance ||
        (oldBinding[0] === distance &&
          Selector.calculateSpecificity(oldBinding[1].selector) >
            Selector.calculateSpecificity(kb.selector))
      ) {
        continue;
      }
    }
    activeBindings.set(formatted, [distance, kb]);
  }

  // Group shortcuts by distance
  let maxDistance = -1;
  const groupedBindings = new Map<number, CommandRegistry.IKeyBinding[]>();
  for (let [distance, binding] of activeBindings.values()) {
    maxDistance = Math.max(distance, maxDistance);
    if (!groupedBindings.has(distance)) {
      groupedBindings.set(distance, []);
    }
    groupedBindings.get(distance)!.push(binding);
  }

  // Display shortcuts by group
  const bindingTable: any = [];
  for (let d = 0; d <= maxDistance; d++) {
    if (groupedBindings.has(d)) {
      bindingTable.push(
        groupedBindings.get(d)!.map(b => (
          <tr className="jp-ContextualShortcut-TableRow" key={b.command}>
            <td className="jp-ContextualShortcut-TableItem">
              {CommandRegistry.formatKeystroke(b.keys)}
            </td>
            <td>{commands.label(b.command, b.args)}</td>
          </tr>
        ))
      );
      bindingTable.push(
        <tr className="jp-ContextualShortcut-TableLastRow"></tr>
      );
    }
  }

  const body = (
    <table>
      <thead>
        <tr>
          <th className="jp-ContextualShortcut-TableHeader">
            {trans.__('Shortcut')}
          </th>
          <th className="jp-ContextualShortcut-TableHeader">
            {trans.__('Label')}
          </th>
        </tr>
      </thead>
      <tbody>{bindingTable}</tbody>
    </table>
  );

  return showDialog({
    title: trans.__('Keyboard Shortcuts'),
    body,
    buttons: [
      Dialog.cancelButton({
        label: trans.__('Dismiss')
      })
    ]
  });
}
