namespace DiagnosticSeverity {
  export const Error = 1;
  export const Warning = 2;
  export const Information = 3;
  export const Hint = 4;
}

export namespace CompletionItemKind {
  export const Text = 1;
  export const Method = 2;
  export const Function = 3;
  export const Constructor = 4;
  export const Field = 5;
  export const Variable = 6;
  export const Class = 7;
  export const Interface = 8;
  export const Module = 9;
  export const Property = 10;
  export const Unit = 11;
  export const Value = 12;
  export const Enum = 13;
  export const Keyword = 14;
  export const Snippet = 15;
  export const Color = 16;
  export const File = 17;
  export const Reference = 18;
  export const Folder = 19;
  export const EnumMember = 20;
  export const Constant = 21;
  export const Struct = 22;
  export const Event = 23;
  export const Operator = 24;
  export const TypeParameter = 25;
}

export namespace DocumentHighlightKind {
  export const Text = 1;
  export const Read = 2;
  export const Write = 3;
}

export function inverse_namespace(namespace: object): Record<number, string> {
  const records: Record<number, string> = {};
  for (let key of Object.keys(namespace)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    records[namespace[key]] = key;
  }
  return records;
}

/**
 * Why programmatic solution rather than hard-coding the namespace the other way around?
 * Because the namespaces are copy-paste from the LSP specification, and it will be easier
 * to maintain this way in the future.
 *
 * Why not simply import from lsProtocol?
 * Because this triggers some strange webpack issue as an additional package would need to be included.
 * Interestingly, the same thing happens when using CompletionTriggerKind.Invoked from lsProtocol.
 */
export const diagnosticSeverityNames = inverse_namespace(DiagnosticSeverity);
export const completionItemKindNames = inverse_namespace(CompletionItemKind);
export const documentHighlightKindNames = inverse_namespace(
  DocumentHighlightKind
);

export namespace CompletionTriggerKind {
  export const Invoked = 1;
  export const TriggerCharacter = 2;
  export const TriggerForIncompleteCompletions = 3;
}
export type CompletionTriggerKind = 1 | 2 | 3;
