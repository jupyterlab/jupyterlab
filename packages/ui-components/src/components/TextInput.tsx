/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import * as React from 'react';

export const TextInput: React.FC<any> = ({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  schema
}) => {
  const descriptionRef: React.RefObject<HTMLParagraphElement> = React.createRef();
  const expandOrCollapseDescription = () => {
    console.log(descriptionRef.current?.clientHeight);
  };
  return (
    <div>
      {value && schema.default !== value ? (
        <div className="jp-modifiedIndicator" />
      ) : undefined}
      <div>
        <h3> {schema.title} </h3>
        <p ref={descriptionRef} onClick={expandOrCollapseDescription}>
          {' '}
          {schema.description}{' '}
        </p>

        <input
          onChange={e => {
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          onBlur={e => {
            onBlur(id, e.target.value);
          }}
          value={value ?? schema.default ?? ''}
        />
      </div>
    </div>
  );
};
