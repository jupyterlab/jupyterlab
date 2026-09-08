/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { JupyterFrontEndPlugin } from '@jupyterlab/application';
import {
  AccessibleAnnouncer,
  IAccessibleAnnouncer
} from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

/**
 * The accessibility announcement service.
 */
export const accessibleAnnouncerPlugin: JupyterFrontEndPlugin<IAccessibleAnnouncer> =
  {
    id: '@jupyterlab/apputils-extension:accessible-announcer',
    description: 'Provides an API for announcing messages to screen readers.',
    autoStart: true,
    provides: IAccessibleAnnouncer,
    optional: [ISettingRegistry],
    activate: (_app, settingRegistry: ISettingRegistry | null) => {
      const announcer = new AccessibleAnnouncer();

      if (settingRegistry) {
        void settingRegistry
          .load(accessibleAnnouncerPlugin.id)
          .then(settings => {
            const updateSettings = () => {
              announcer.enabled = settings.get('enabled').composite as boolean;
              announcer.clearTimeout = settings.get('clearTimeout')
                .composite as number;
            };

            updateSettings();
            settings.changed.connect(updateSettings);
          });
      }

      return announcer;
    }
  };
