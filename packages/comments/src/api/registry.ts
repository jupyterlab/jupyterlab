// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommentFactory, CommentWidgetFactory } from './factory';
import { ICommentRegistry, ICommentWidgetRegistry } from './token';

/**
 * A class that manages a map of `CommentFactory`s
 */
export class CommentRegistry implements ICommentRegistry {
  addFactory(factory: CommentFactory): void {
    this.factories.set(factory.type, factory);
  }

  getFactory(type: string): CommentFactory<any> | undefined {
    return this.factories.get(type);
  }

  readonly factories = new Map<string, CommentFactory>();
}

/**
 * A class that manages a map of `CommentWidgetFactory`s
 */
export class CommentWidgetRegistry implements ICommentWidgetRegistry {
  addFactory(factory: CommentWidgetFactory<any>): void {
    this.factories.set(factory.widgetType, factory);
  }

  getFactory(type: string): CommentWidgetFactory<any> | undefined {
    return this.factories.get(type);
  }

  readonly factories = new Map<string, CommentWidgetFactory<any>>();
}
