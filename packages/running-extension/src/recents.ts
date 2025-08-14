// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommandRegistry } from '@lumino/commands';
import { PathExt } from '@jupyterlab/coreutils';
import { IRunningSessionManagers, IRunningSessions } from '@jupyterlab/running';
import { ITranslator } from '@jupyterlab/translation';
import { IRecentsManager, RecentDocument } from '@jupyterlab/docmanager';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { fileIcon, LabIcon } from '@jupyterlab/ui-components';

/**
 * Add the 'recently closed' section to the running panel.
 *
 * @param managers - The IRunningSessionManagers used to register this section.
 * @param recentsManager - The recent documents manager.
 * @param commands - The command registry.
 * @param docRegistry - Document registry.
 * @param translator - The translator to use.
 */
export function addRecentlyClosedSessionManager(
  managers: IRunningSessionManagers,
  recentsManager: IRecentsManager,
  commands: CommandRegistry,
  docRegistry: DocumentRegistry,
  translator: ITranslator
): void {
  const trans = translator.load('jupyterlab');

  managers.add({
    name: trans.__('Recently Closed'),
    supportsMultipleViews: false,
    running: () => {
      return recentsManager.recentlyClosed.map((recent: RecentDocument) => {
        return new RecentItem(recent);
      });
    },
    shutdownAll: () => {
      for (const widget of recentsManager.recentlyClosed) {
        recentsManager.removeRecent(widget, 'closed');
      }
    },
    refreshRunning: () => {
      return void 0;
    },
    runningChanged: recentsManager.changed,
    shutdownLabel: trans.__('Forget'),
    shutdownAllLabel: trans.__('Forget All'),
    shutdownAllConfirmationText: trans.__(
      'Are you sure you want to clear recently closed tabs?'
    )
  });

  class RecentItem implements IRunningSessions.IRunningItem {
    constructor(recent: RecentDocument) {
      this._recent = recent;
    }
    async open() {
      const recent = this._recent;
      const isValid = await recentsManager.validate(recent);
      if (!isValid) {
        return;
      }
      await commands.execute('docmanager:open', {
        path: recent.path,
        factory: recent.factory
      });
      recentsManager.removeRecent(recent, 'closed');
    }
    shutdown() {
      recentsManager.removeRecent(this._recent, 'closed');
    }
    icon() {
      if (!this._recent.factory) {
        return fileIcon;
      }
      // Prefer path inference as it is more granular.
      const fileTypes = docRegistry.getFileTypesForPath(this._recent.path);
      for (const fileType of fileTypes) {
        const icon = fileType.icon;
        if (icon instanceof LabIcon) {
          return icon;
        }
      }
      // Fallback to factory-base inference.
      const factory = docRegistry.getWidgetFactory(this._recent.factory);
      if (factory) {
        for (const fileTypeName of factory.fileTypes) {
          const fileType = docRegistry.getFileType(fileTypeName);
          const icon = fileType?.icon;
          if (icon instanceof LabIcon) {
            return icon;
          }
        }
      }
      return fileIcon;
    }
    label() {
      return PathExt.basename(this._recent.path);
    }
    labelTitle() {
      return this._recent.path;
    }

    private _recent: RecentDocument;
  }
}
