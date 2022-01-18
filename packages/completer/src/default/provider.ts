import { ICompletionProvider } from '../tokens';
import { CompletionConnector } from './connector';
import { CompletionHandler } from '../handler';

export const DEFAULT_PROVIDER_ID = 'CompletionProvider:base'

export class DefaultCompletionProvider implements ICompletionProvider {
  
  connectorFactory(
    options: CompletionConnector.IOptions
  ): CompletionHandler.ICompletionItemsConnector {
    return new CompletionConnector(options);
  }
  identifier = DEFAULT_PROVIDER_ID;
  renderer = null;
}
