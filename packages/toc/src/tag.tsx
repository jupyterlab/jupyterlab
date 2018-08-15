import * as React from 'react';
import StyleClasses from './styles';

const TagStyleClasses = StyleClasses.TagStyleClasses;

export interface TagComponentProps {
  selectionStateHandler: (newState: string, add: boolean) => void;
  selectedTags: string[];
  tag: string;
}

export abstract class TagComponent extends React.Component<TagComponentProps> {
  constructor(props: TagComponentProps) {
    super(props);
  }

  render() {
    const tag = this.props.tag as string;
    return (
      <div>
        <label
          className={TagStyleClasses.tagLabelStyleClass}
          key={new Date().toLocaleTimeString()}
        >
          {tag}
        </label>
      </div>
    );
  }
}
