export const RPY2_MAX_ARGS = 10;

export function extract_r_args(args: string[], content_position: number) {
  let inputs = [];
  let outputs = [];
  let others = [];
  for (let i = 0; i < args.length; i = i + 2) {
    let arg = args[i];
    let variable = args[i + 1];
    if (arg == null) {
      break;
    } else if (arg === 'i' || arg === '-input') {
      inputs.push(variable);
    } else if (arg === 'o' || arg === '-output') {
      outputs.push(variable);
    } else {
      others.push('-' + arg + ' ' + variable);
    }
  }
  return {
    inputs: inputs,
    outputs: outputs,
    rest: args[args.length + content_position],
    others: others
  };
}

export function parse_r_args(args: string[], content_position: number) {
  let { inputs, outputs, rest, others } = extract_r_args(
    args,
    content_position
  );
  let input_variables = inputs.join(', ');
  if (input_variables) {
    input_variables = ', ' + input_variables;
  }
  let output_variables = outputs.join(', ');
  if (output_variables) {
    output_variables = output_variables + ' = ';
  }
  return {
    content: rest,
    others: others.join(' '),
    inputs: input_variables,
    outputs: output_variables
  };
}

export function rpy2_reverse_pattern(
  quote = '"',
  multi_line = false,
  magic = 'R'
): string {
  return (
    '(\\S+)?' +
    '(?:, (\\S+))?'.repeat(9) +
    '( = )?rpy2\\.ipython\\.rmagic\\.RMagics.' +
    magic +
    '\\(' +
    quote +
    (multi_line ? '([\\s\\S]*)' : '(.*?)') +
    quote +
    ', "(.*?)"' +
    '(?:, (\\S+))?'.repeat(10) +
    '\\)'
  );
}

export function rpy2_reverse_replacement(match: string, ...args: string[]) {
  let outputs = [];
  for (let i = 0; i < 10; i++) {
    if (args[i] == null) {
      break;
    }
    outputs.push(args[i]);
  }
  let inputs = [];
  for (let i = 13; i < 23; i++) {
    if (args[i] == null) {
      break;
    }
    inputs.push(args[i]);
  }
  let input_variables = inputs.join(' -i ');
  if (input_variables) {
    input_variables = ' -i ' + input_variables;
  }
  let output_variables = outputs.join(' -o ');
  if (output_variables) {
    output_variables = ' -o ' + output_variables;
  }
  let contents = args[11];
  let other_args = args[12];
  if (other_args) {
    other_args = ' ' + other_args;
  }
  return {
    input: input_variables,
    output: output_variables,
    other: other_args,
    contents: contents
  };
}

export function rpy2_args_pattern(max_n: number) {
  return '(?: -(\\S+) (\\S+))?'.repeat(max_n);
}
