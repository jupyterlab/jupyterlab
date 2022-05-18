// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { WidgetTracker } from '@jupyterlab/apputils';
import {
  CommentFileModelFactory,
  CommentPanel,
  CommentRegistry,
  CommentWidget,
  CommentWidgetRegistry,
  ICommentPanel,
  ICommentRegistry,
  ICommentWidgetRegistry
} from '@jupyterlab/comments';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry, DocumentWidget } from '@jupyterlab/docregistry';
import { Menu } from '@lumino/widgets';

namespace CommandIDs {
  export const addComment = 'jupyterlab:add-comment';
  export const deleteComment = 'jupyterlab:delete-comment';
  export const editComment = 'jupyterlab:edit-comment';
  export const replyToComment = 'jupyterlab:reply-to-comment';
  export const save = 'jupyterlab:save';
}

export type CommentTracker = WidgetTracker<CommentWidget<any>>;

/**
 * A plugin that provides a `CommentRegistry`
 */
export const commentRegistryPlugin: JupyterFrontEndPlugin<ICommentRegistry> = {
  id: '@jupyterlab/comments-extension:registry',
  autoStart: true,
  provides: ICommentRegistry,
  activate: (app: JupyterFrontEnd) => {
    return new CommentRegistry();
  }
};

/**
 * A plugin that provides a `CommentWidgetRegistry`
 */
export const commentWidgetRegistryPlugin: JupyterFrontEndPlugin<ICommentWidgetRegistry> =
  {
    id: '@jupyterlab/comments-extension:widget-registry',
    autoStart: true,
    provides: ICommentWidgetRegistry,
    activate: (app: JupyterFrontEnd) => {
      return new CommentWidgetRegistry();
    }
  };

export const jupyterCommentingPlugin: JupyterFrontEndPlugin<ICommentPanel> = {
  id: '@jupyterlab/comments-extension:api',
  autoStart: true,
  requires: [
    ICommentRegistry,
    ICommentWidgetRegistry,
    ILabShell,
    IDocumentManager,
    IRenderMimeRegistry
  ],
  provides: ICommentPanel,
  activate: (
    app: JupyterFrontEnd,
    commentRegistry: ICommentRegistry,
    commentWidgetRegistry: ICommentWidgetRegistry,
    shell: ILabShell,
    docManager: IDocumentManager,
    renderer: IRenderMimeRegistry
  ): CommentPanel => {
    const filetype: DocumentRegistry.IFileType = {
      contentType: 'file',
      displayName: 'comment',
      extensions: ['.comment'],
      fileFormat: 'json',
      name: 'comment',
      mimeTypes: ['application/json']
    };

    const commentTracker = new WidgetTracker<CommentWidget<any>>({
      namespace: 'comment-widgets'
    });

    const panel = new CommentPanel({
      commands: app.commands,
      commentRegistry,
      commentWidgetRegistry,
      docManager,
      shell,
      renderer
    });

    // Create the directory holding the comments.
    void panel.pathExists(panel.pathPrefix).then(exists => {
      const contents = docManager.services.contents;
      if (!exists) {
        void contents
          .newUntitled({
            path: '/',
            type: 'directory'
          })
          .then(model => {
            void contents.rename(model.path, panel.pathPrefix);
          });
      }
    });

    addCommands(app, commentTracker, panel);

    const commentMenu = new Menu({ commands: app.commands });
    commentMenu.addItem({ command: CommandIDs.deleteComment });
    commentMenu.addItem({ command: CommandIDs.editComment });
    commentMenu.addItem({ command: CommandIDs.replyToComment });

    app.contextMenu.addItem({
      command: CommandIDs.deleteComment,
      selector: '.jp-comments-Comment'
    });
    app.contextMenu.addItem({
      command: CommandIDs.editComment,
      selector: '.jp-comments-Comment'
    });
    app.contextMenu.addItem({
      command: CommandIDs.replyToComment,
      selector: '.jp-comments-Comment'
    });

    const modelFactory = new CommentFileModelFactory({
      commentRegistry,
      commentWidgetRegistry,
      commentMenu
    });

    app.docRegistry.addFileType(filetype);
    app.docRegistry.addModelFactory(modelFactory);

    // Add the panel to the shell's right area.
    shell.add(panel, 'right', { rank: 600 });

    // Load model for current document when it changes
    shell.currentChanged.connect((_, args) => {
      if (args.newValue != null && args.newValue instanceof DocumentWidget) {
        const docWidget = args.newValue as DocumentWidget;
        docWidget.context.ready
          .then(() => {
            void panel.loadModel(docWidget.context);
          })
          .catch(() => {
            console.warn('Unable to load panel');
          });
      }
    });

    // Update comment widget tracker when model changes
    panel.modelChanged.connect((_, fileWidget) => {
      if (fileWidget != null) {
        fileWidget.widgets.forEach(
          widget => void commentTracker.add(widget as CommentWidget<any>)
        );
        fileWidget.commentAdded.connect(
          (_, commentWidget) => void commentTracker.add(commentWidget)
        );
      }
    });

    // Reveal the comment panel when a comment is added.
    panel.commentAdded.connect((_, comment) => {
      const identity = comment.identity;

      // If you didn't make the comment, ignore it
      // Comparing ids would be better but they're not synchronized across Docs/awarenesses
      if (identity == null || identity.name !== panel.localIdentity.name) {
        return;
      }

      // Automatically opens panel when a document with comments is opened,
      // or when the local user adds a new comment
      if (!panel.isVisible) {
        shell.activateById(panel.id);
        if (comment.text === '') {
          comment.openEditActive();
        }
      }

      panel.scrollToComment(comment.id);
    });

    app.contextMenu.addItem({
      command: CommandIDs.save,
      selector: '.jp-comments-CommentPanel'
    });

    return panel;
  }
};

function addCommands(
  app: JupyterFrontEnd,
  commentTracker: CommentTracker,
  panel: ICommentPanel
): void {
  app.commands.addCommand(CommandIDs.save, {
    label: 'Save Comments',
    execute: () => {
      const fileWidget = panel.fileWidget;
      if (fileWidget == null) {
        return;
      }

      void fileWidget.context.save();
    }
  });

  app.commands.addCommand(CommandIDs.deleteComment, {
    label: 'Delete Comment',
    execute: () => {
      const currentComment = commentTracker.currentWidget;
      if (currentComment != null) {
        currentComment.deleteActive();
      }
    }
  });

  app.commands.addCommand(CommandIDs.editComment, {
    label: 'Edit Comment',
    execute: () => {
      const currentComment = commentTracker.currentWidget;
      if (currentComment != null) {
        currentComment.openEditActive();
      }
    }
  });

  app.commands.addCommand(CommandIDs.replyToComment, {
    label: 'Reply to Comment',
    execute: () => {
      const currentComment = commentTracker.currentWidget;
      if (currentComment != null) {
        currentComment.revealReply();
      }
    }
  });
}

const plugins: JupyterFrontEndPlugin<any>[] = [
  jupyterCommentingPlugin,
  commentRegistryPlugin,
  commentWidgetRegistryPlugin
];

export default plugins;
