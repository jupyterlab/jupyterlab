/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { EditorState, Extension } from '@codemirror/state';
import { Facet } from '@codemirror/state';
import { CommandRegistry } from '@lumino/commands';

/**
 * The command registry as visible to editor commands.
 *
 * Editor commands may consult the shortcuts and the state of their commands,
 * but they may not execute, register or dispatch them.
 */
export interface IReadonlyCommandRegistry extends Pick<
  CommandRegistry,
  'isEnabled' | 'keyBindingChanged' | 'keyBindings'
> {}

/**
 * Facet holding the command registry whose keyboard shortcuts apply to the editor.
 */
export const commandRegistryFacet = Facet.define<
  IReadonlyCommandRegistry,
  IReadonlyCommandRegistry | null
>({
  combine: values => values[0] ?? null
});

/**
 * Extension giving editor commands access to the application command registry.
 *
 * Editor commands use it through `hasKeyBinding` to decline a key claimed
 * by a keyboard shortcut, see `StateCommands.indentMoreOrInsertTab`.
 *
 * @param commands - Application command registry
 * @returns CodeMirror extension
 */
export function commandRegistry(commands: IReadonlyCommandRegistry): Extension {
  return commandRegistryFacet.of(commands);
}

/**
 * Whether a keyboard shortcut for `keystroke` applies to the editor.
 *
 * This mirrors the shortcut matching of the command registry: the shortcut
 * selector must match the editor content element or one of its ancestors,
 * and the command must be enabled. Chords are not considered.
 *
 * @param view - Editor view
 * @param keystroke - Keystroke, e.g. `'Tab'` or `'Accel Enter'`
 * @returns Whether a shortcut claims the keystroke; `false` without a command registry
 */
export function hasKeyBinding(
  view: { state: EditorState; contentDOM: HTMLElement },
  keystroke: string
): boolean {
  const commands = view.state.facet(commandRegistryFacet);
  if (!commands) {
    return false;
  }
  const target = view.contentDOM;
  if (target.closest('[data-lm-suppress-shortcuts]')) {
    return false;
  }
  const keys = CommandRegistry.normalizeKeystroke(keystroke);
  return commands.keyBindings.some(
    binding =>
      binding.keys.length === 1 &&
      binding.keys[0] === keys &&
      target.closest(binding.selector) !== null &&
      commands.isEnabled(binding.command, binding.args)
  );
}
