import * as React from 'react';

import { ISignal } from '@phosphor/signaling';

interface IUseSignalProps<SENDER, ARGS> {
  signal: ISignal<SENDER, ARGS>;
  initial: [SENDER, ARGS];
  slot: (sender: SENDER, args: ARGS) => JSX.Element;
}

interface IUseSignalState<SENDER, ARGS> {
  value: [SENDER, ARGS];
}

export class UseSignal<SENDER, ARGS> extends React.Component<
  IUseSignalProps<SENDER, ARGS>,
  IUseSignalState<SENDER, ARGS>
> {
  constructor(props: IUseSignalProps<SENDER, ARGS>) {
    super(props);
    this.state = { value: this.props.initial };
  }

  componentDidMount() {
    this.props.signal.connect(this.slot);
  }

  componentWillUnmount() {
    this.props.signal.disconnect(this.slot);
  }

  private slot = (sender: SENDER, args: ARGS) => {
    this.setState({ value: [sender, args] });
  };

  render() {
    return this.props.slot(...this.state.value);
  }
}
