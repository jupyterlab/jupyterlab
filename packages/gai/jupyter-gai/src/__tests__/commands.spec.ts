/**
 * [Jest](https://jestjs.io/docs/getting-started) unit tests for commands.ts
 */

import { splitMarkdown } from "../commands";

describe('commands', () => {
  it('should split markdown into markdown, code, and markdown cells', () => {
    const input = `This is before the code

\`\`\`py
print("Hello world!")
\`\`\`

This is after the code`;

    const output = splitMarkdown(input);
    expect(output.length).toEqual(3);
    expect(output[0].cellType).toBe('markdown');
    expect(output[0].source).toBe('This is before the code');
    expect(output[1].cellType).toBe('code');
    expect(output[1].source).toBe('print("Hello world!")');
    expect(output[2].cellType).toBe('markdown');
    expect(output[2].source).toBe('This is after the code');
  });

  it('should split markdown into markdown, code, markdown, code, and markdown cells', () => {
    const input = `This is before the first code

\`\`\`py
print("Hello world!")
\`\`\`

This is between the code cells

\`\`\`bash
echo "Bonjour le monde !"
\`\`\`

This is after both code cells`;

    const output = splitMarkdown(input);
    expect(output.length).toEqual(5);
    expect(output[0].cellType).toBe('markdown');
    expect(output[0].source).toBe('This is before the first code');
    expect(output[1].cellType).toBe('code');
    expect(output[1].source).toBe('print("Hello world!")');
    expect(output[2].cellType).toBe('markdown');
    expect(output[2].source).toBe('This is between the code cells');
    expect(output[3].cellType).toBe('code');
    expect(output[3].source).toBe('echo "Bonjour le monde !"');
    expect(output[4].cellType).toBe('markdown');
    expect(output[4].source).toBe('This is after both code cells');
  });

  it('should split a malformed code cell into code', () => {
    const input = `\`\`\`py
print("Hello world!")`; // No closing triple-backtick

    const output = splitMarkdown(input);
    expect(output.length).toEqual(1);
    expect(output[0].cellType).toBe('code');
    // The opening triple-backtick should still be suppressed
    expect(output[0].source).toBe('print("Hello world!")');
  });

  it('should split one markdown cell', () => {
    const input = `This is just markdown`;

    const output = splitMarkdown(input);
    expect(output.length).toEqual(1);
    expect(output[0].cellType).toBe('markdown');
    expect(output[0].source).toBe('This is just markdown');
  });
});
