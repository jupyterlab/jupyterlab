/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { CommandRegistry } from '@lumino/commands';
import { Selector } from '@lumino/domutils';
import * as React from 'react';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { TranslationBundle } from '@jupyterlab/translation';

/**
 * The class name for each row of ContextShortcutTable
 */
const SHORTCUT_TABLE_ROW_CLASS = 'jp-ContextualShortcut-TableRow';
/**
 * The class name for the last row of ContextShortcutTable
 */
const SHORTCUT_TABLE_LAST_ROW_CLASS = 'jp-ContextualShortcut-TableLastRow';
/**
 * The class name for each item of ContextShortcutTable
 */
const SHORTCUT_TABLE_ITEM_CLASS = 'jp-ContextualShortcut-TableItem';
/**
 * The class name for each button-like symbol representing a key used in a shortcut in the ContextShortcutTable
 */
const SHORTCUT_KEY_CLASS = 'jp-ContextualShortcut-Key';

/**
 * Display shortcuts options
 */
export interface IOptions {
  /**
   * Application commands registry
   */
  commands: CommandRegistry;
  /**
   * Translation object
   */
  trans: TranslationBundle;
  /**
   * Element on which to display the keyboard shortcuts help
   */
  activeElement?: Element;
}

export function displayShortcuts(options: IOptions) {
  const { commands, trans, activeElement } = options;
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

  function formatKeys(keys: string[]): JSX.Element {
    const topContainer: JSX.Element[] = [];
    keys.forEach((key, index) => {
      const container: JSX.Element[] = [];
      key.split(' ').forEach((ch, chIndex) => {
        container.push(
          <span className={SHORTCUT_KEY_CLASS} key={`ch-${chIndex}`}>
            <kbd>{ch}</kbd>
          </span>,
          <React.Fragment key={`fragment-${chIndex}`}> + </React.Fragment>
        );
      });
      topContainer.push(
        <span key={`key-${index}`}>{container.slice(0, -1)}</span>,
        <React.Fragment key={`fragment-${index}`}> + </React.Fragment>
      );
    });
    return <span>{topContainer.slice(0, -1)}</span>;
  }

  function capitalizeString(str: string) {
    const capitalizedStr = str.charAt(0).toUpperCase() + str.slice(1);
    return capitalizedStr;
  }

  function formatLabel(b: CommandRegistry.IKeyBinding) {
    const label = commands.label(b.command);
    const commandID = b.command.split(':')[1];
    const automaticLabel = commandID.split('-');
    let capitalizedLabel = '';
    for (let i = 0; i < automaticLabel.length; i++) {
      const str = capitalizeString(automaticLabel[i]);
      capitalizedLabel = capitalizedLabel + ' ' + str;
    }

    if (label.length > 0) {
      return label;
    } else {
      return capitalizedLabel;
    }
  }

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
          <tr
            className={SHORTCUT_TABLE_ROW_CLASS}
            key={`${b.command}-${b.keys.join('-').replace(' ', '_')}`}
          >
            <td className={SHORTCUT_TABLE_ITEM_CLASS}>{formatLabel(b)}</td>
            <td className={SHORTCUT_TABLE_ITEM_CLASS}>
              {formatKeys([...b.keys])}
            </td>
          </tr>
        ))
      );
      bindingTable.push(
        <tr
          className={SHORTCUT_TABLE_LAST_ROW_CLASS}
          key={`group-${d}-last`}
        ></tr>
      );
    }
  }

  const body = (
    <table>
      <tbody>{bindingTable}</tbody>
    </table>
  );

  return showDialog({
    title: trans.__('Keyboard Shortcuts'),
    body,
    buttons: [
      Dialog.cancelButton({
        label: trans.__('Close')
      })
    ]
  });
}
