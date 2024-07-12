// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import type { Field, Widget } from '@rjsf/utils';

/**
 * Form renderer interface.
 */
export interface IFormRenderer {
  /**
   * A React component with properties FieldProps.
   */
  fieldRenderer?: Field;

  /**
   * A React component with properties WidgetProps.
   */
  widgetRenderer?: Widget;
}

/**
 * A registry for rendering fields used in the FormEditor component.
 */
export interface IFormRendererRegistry {
  /**
   * Adds a renderer for a given property of a given settings plugin.
   *
   * The id must follow that structure `<ISettingRegistry.IPlugin.id>.<propertyName>`
   *
   * @param id - Unique ID for the given renderer.
   * @param renderer - A renderer interfacing IFormRenderer.
   */
  addRenderer: (id: string, renderer: IFormRenderer) => void;

  /**
   * Returns the component for the given id
   * @param id - The unique id for the component.
   * @returns - A component interfacing IFormComponent.
   */
  getRenderer: (id: string) => IFormRenderer;

  /**
   * Returns all registered renderers in dictionary form.
   * @returns - A dictionary that maps an id to a renderer.
   */
  renderers: { [id: string]: IFormRenderer };
}

/**
 * The token for the form component registry.
 */
export const IFormRendererRegistry = new Token<IFormRendererRegistry>(
  '@jupyterlab/ui-components:IFormRendererRegistry',
  'A service for settings form renderer registration.'
);

/**
 * Placeholder for future icon manager class to assist with
 * overriding/replacing particular sets of icons
 */
export interface ILabIconManager {}

/**
 * The ILabIconManager token.
 */
export const ILabIconManager = new Token<ILabIconManager>(
  '@jupyterlab/ui-components:ILabIconManager',
  'A service to register and request icons.'
);
