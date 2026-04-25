/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
----------------------------------------------------------------------------*/

import type {
  ICodeOptimizer,
  OptimizedCode,
  OptimizationOptions
} from './interfaces';
import type {
  ILSPDocumentConnectionManager,
  ILSPConnection
} from '@jupyterlab/lsp';
import type * as lsp from 'vscode-languageserver-protocol';
import { Method } from '@jupyterlab/lsp';

/**
 * LSP-based code optimizer.
 *
 * Leverages Language Server Protocol capabilities for code actions and refactoring.
 */
export class LSPOptimizer implements ICodeOptimizer {
  /**
   * Create a new LSP optimizer.
   *
   * @param connectionManager - The LSP document connection manager
   * @param options - LSP optimization options
   */
  constructor(
    private connectionManager: ILSPDocumentConnectionManager | null,
    private options?: LSPOptimizer.IOptions
  ) {}

  /**
   * Optimize code using LSP code actions.
   *
   * @param code - The source code to optimize
   * @param language - The programming language
   * @param options - Optimization options
   * @returns Optimized code with transformation details
   */
  async optimize(
    code: string,
    language: string,
    options?: OptimizationOptions
  ): Promise<OptimizedCode> {
    const transformations: Array<{
      type: string;
      description: string;
      range: { start: number; end: number };
      confidence: number;
    }> = [];

    if (!this.connectionManager) {
      console.warn('LSP connection manager not available, returning original code');
      return {
        code,
        transformations,
        metrics: {
          originalSize: code.length,
          optimizedSize: code.length,
          complexityReduction: 0
        }
      };
    }

    try {
      // Get the first available connection
      const connections = Array.from(this.connectionManager.connections.values());
      if (connections.length === 0) {
        console.warn('No LSP connections available');
        return {
          code,
          transformations,
          metrics: {
            originalSize: code.length,
            optimizedSize: code.length,
            complexityReduction: 0
          }
        };
      }

      const connection = connections[0];
      const virtualDocuments = Array.from(
        this.connectionManager.documents.values()
      );

      if (virtualDocuments.length === 0) {
        console.warn('No virtual documents available');
        return {
          code,
          transformations,
          metrics: {
            originalSize: code.length,
            optimizedSize: code.length,
            complexityReduction: 0
          }
        };
      }

      const virtualDocument = virtualDocuments[0];
      const uri = virtualDocument.uri;

      // Request code actions from LSP
      const codeActions = await this.requestCodeActions(
        connection,
        uri,
        code
      );

      if (!codeActions || codeActions.length === 0) {
        console.log('No code actions available from LSP');
        return {
          code,
          transformations,
          metrics: {
            originalSize: code.length,
            optimizedSize: code.length,
            complexityReduction: 0
          }
        };
      }

      // Filter and apply refactorings
      const optimizedCode = await this.applyRefactorings(
        code,
        codeActions,
        transformations
      );

      return {
        code: optimizedCode,
        transformations,
        metrics: {
          originalSize: code.length,
          optimizedSize: optimizedCode.length,
          complexityReduction:
            ((code.length - optimizedCode.length) / code.length) * 100
        }
      };
    } catch (error) {
      console.error('LSP optimization failed:', error);
      // Return original code on error
      return {
        code,
        transformations,
        metrics: {
          originalSize: code.length,
          optimizedSize: code.length,
          complexityReduction: 0
        }
      };
    }
  }

  /**
   * Request code actions from LSP.
   *
   * @param connection - The LSP connection
   * @param uri - The document URI
   * @param code - The source code
   * @returns Array of code actions
   */
  private async requestCodeActions(
    connection: ILSPConnection,
    uri: string,
    code: string
  ): Promise<(lsp.Command | lsp.CodeAction)[] | null> {
    const timeout = this.options?.timeout || 5000;

    // Create a range covering the entire document
    const range: lsp.Range = {
      start: { line: 0, character: 0 },
      end: { line: code.split('\n').length, character: 0 }
    };

    const params: lsp.CodeActionParams = {
      textDocument: { uri },
      range,
      context: {
        diagnostics: []
      }
    };

    try {
      const result = await Promise.race([
        connection.clientRequests[Method.ClientRequest.CODE_ACTION].request(
          params
        ),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('LSP timeout')), timeout)
        )
      ]);

      return result as (lsp.Command | lsp.CodeAction)[];
    } catch (error) {
      console.error('Error requesting code actions:', error);
      return null;
    }
  }

  /**
   * Apply LSP refactorings to the code.
   *
   * @param code - The original code
   * @param actions - Array of code actions
   * @param transformations - Array to track transformations
   * @returns Optimized code
   */
  private async applyRefactorings(
    code: string,
    actions: (lsp.Command | lsp.CodeAction)[],
    transformations: Array<{
      type: string;
      description: string;
      range: { start: number; end: number };
      confidence: number;
    }>
  ): Promise<string> {
    let transformed = code;

    for (const action of actions) {
      // Check if this is an optimization-related action
      if (this.isOptimizationAction(action)) {
        const codeAction = action as lsp.CodeAction;

        // Track the transformation
        transformations.push({
          type: codeAction.kind || 'lsp-refactoring',
          description: codeAction.title || 'LSP refactoring',
          range: { start: 0, end: code.length },
          confidence: 0.8
        });

        // Apply the workspace edit if present
        if (codeAction.edit) {
          transformed = this.applyWorkspaceEdit(transformed, codeAction.edit);
        }
      }
    }

    return transformed;
  }

  /**
   * Check if an action is an optimization-related action.
   *
   * @param action - The code action or command
   * @returns True if it's an optimization action
   */
  private isOptimizationAction(action: lsp.Command | lsp.CodeAction): boolean {
    const codeAction = action as lsp.CodeAction;
    if (!codeAction.kind) {
      return false;
    }

    const optimizationKinds = [
      'refactor.extract.function',
      'refactor.inline',
      'refactor.rewrite',
      'quickfix',
      'source.organizeImports',
      'source.fixAll'
    ];

    return optimizationKinds.some((kind) =>
      codeAction.kind?.startsWith(kind)
    );
  }

  /**
   * Apply a workspace edit to the code.
   *
   * @param code - The original code
   * @param edit - The workspace edit
   * @returns Modified code
   */
  private applyWorkspaceEdit(
    code: string,
    edit: lsp.WorkspaceEdit
  ): string {
    if (!edit.documentChanges) {
      return code;
    }

    let transformed = code;

    // Apply text document edits
    const changes = edit.documentChanges;
    if (Array.isArray(changes)) {
      for (const change of changes) {
        if ('edit' in change) {
          const textEdit = change.edit;
          if (textEdit && Array.isArray(textEdit) && textEdit.length > 0) {
            // Apply edits in reverse order to preserve positions
            for (let i = textEdit.length - 1; i >= 0; i--) {
              const editItem = textEdit[i];
              transformed = this.applyTextEdit(transformed, editItem);
            }
          }
        }
      }
    }

    return transformed;
  }

  /**
   * Apply a single text edit to the code.
   *
   * @param code - The original code
   * @param edit - The text edit
   * @returns Modified code
   */
  private applyTextEdit(code: string, edit: lsp.TextEdit): string {
    const { range, newText } = edit;
    const lines = code.split('\n');

    const startLine = range.start.line;
    const startChar = range.start.character;
    const endLine = range.end.line;
    const endChar = range.end.character;

    if (startLine === endLine) {
      // Single line edit
      const line = lines[startLine];
      lines[startLine] =
        line.substring(0, startChar) + newText + line.substring(endChar);
    } else {
      // Multi-line edit
      const startLineContent = lines[startLine].substring(0, startChar);
      const endLineContent = lines[endLine].substring(endChar);
      const middleLines = lines.slice(startLine + 1, endLine);

      lines[startLine] = startLineContent + newText;
      lines.splice(startLine + 1, middleLines.length);
      if (endLine < lines.length) {
        lines[startLine + 1] = endLineContent + lines[startLine + 1];
      }
    }

    return lines.join('\n');
  }
}

/**
 * Namespace for LSPOptimizer types.
 */
export namespace LSPOptimizer {
  /**
   * Options for LSP optimizer.
   */
  export interface IOptions {
    /**
     * Timeout for LSP requests in milliseconds.
     */
    timeout?: number;

    /**
     * Whether to fallback to rule-based on error.
     */
    fallbackToRuleBased?: boolean;
  }
}
