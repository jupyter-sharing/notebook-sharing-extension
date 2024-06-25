import React, { useState } from 'react';
import { caretDownIcon, caretRightIcon } from '@jupyterlab/ui-components';

type SharedNotebooksListProp = {
  title: string;
  count: number;
  children: React.ReactNode;
};

export const SharedNotebooksList: React.FC<SharedNotebooksListProp> = ({
  title,
  count,
  children
}) => {
  const [showList, setShowList] = useState(true);
  const handleClick = () => setShowList(prev => !prev);

  return (
    <div className="shared-notebooks-section">
      <div className="shared-notebooks-section-header" onClick={handleClick}>
        {showList ? (
          <caretDownIcon.react className="icon" />
        ) : (
          <caretRightIcon.react className="icon" />
        )}
        <h2>{title}</h2>
        <span className="items-count">({count})</span>
      </div>
      <div className="shared-notebooks-section-container">
        {showList ? (
          <ul className="shared-notebooks-section-list">{children}</ul>
        ) : null}
      </div>
    </div>
  );
};
