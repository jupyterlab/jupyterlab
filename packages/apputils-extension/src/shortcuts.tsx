import { JupyterFrontEnd } from '@jupyterlab/application';
import { CommandRegistry } from '@lumino/commands';
import { Selector } from '@lumino/domutils';
import * as React from 'react';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { TranslationBundle } from '@jupyterlab/translation';

export function displayShortcuts(
  app: JupyterFrontEnd,
  trans: TranslationBundle
) {
  const { commands } = app;
  const elt = document.activeElement;

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
      /* <DEPRECATED> */
      if (targ.hasAttribute('data-p-suppress-shortcuts')) {
        return -1;
      }
      /* </DEPRECATED> */
      if (targ.matches(selector)) {
        return dist;
      }
    }
    return -1;
  }

  function formatKeybinding(keys: readonly string[]): string {
    return keys.map(CommandRegistry.formatKeystroke).join(', ');
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
    let formatted = formatKeybinding(kb.keys);
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
    maxDistance = distance > maxDistance ? distance : maxDistance;
    if (!groupedBindings.has(distance)) {
      groupedBindings.set(distance, []);
    }
    groupedBindings.get(distance)!.push(binding);
  }

  // Display shortcuts by group
  const bindingTable = [];
  for (let d = 0; d <= maxDistance; d++) {
    if (groupedBindings.has(d)) {
      console.log(`Binding level ${d}:`);
      bindingTable.push(
        groupedBindings.get(d)!.map(b => (
          <tr key={b.command}>
            <td
              style={{
                whiteSpace: 'nowrap',
                verticalAlign: 'top',
                padding: '0px 10px',
                fontFamily: 'monospace'
              }}
            >
              {b.keys.map(CommandRegistry.formatKeystroke).join(', ')}
            </td>
            <td style={{ verticalAlign: 'top' }}>
              {commands.label(b.command, b.args)}
            </td>
            <td style={{ verticalAlign: 'top' }}>
              {commands.caption(b.command, b.args)}
            </td>
            <td style={{ verticalAlign: 'top' }}>{b.command}</td>
          </tr>
        ))
      );
      bindingTable.push(<tr style={{ height: '2em' }}></tr>);
    }
  }

  const body = (
    <table>
      <thead>
        <tr>
          <th style={{ textAlign: 'left' }}>Shortcut</th>
          <th style={{ textAlign: 'left' }}>Label</th>
          <th style={{ textAlign: 'left' }}>Description</th>
          <th style={{ textAlign: 'left' }}>Command</th>
        </tr>
      </thead>
      <tbody>{bindingTable}</tbody>
    </table>
  );

  return showDialog({
    title: 'Keyboard Shortcuts',
    body,
    buttons: [
      Dialog.createButton({
        label: trans.__('Dismiss'),
        className: 'jp-mod-reject jp-mod-styled'
      })
    ]
  });
}
