import React, { useState } from 'react';
import { notebookIcon, launchIcon } from '@jupyterlab/ui-components';
import { tryParse } from '@jupyter_sharing/share-extension';
import { Contact } from '@jupyter_sharing/share-extension';

type LiveItemProps = {
  name: string;
  title: string;
  author?: string;
  fileId: string;
  hostLink: string | undefined;
};

export const RTCListItem: React.FC<LiveItemProps> = ({
  name,
  title,
  author,
  fileId,
  hostLink
}) => {
  const [authorName] = useState(
    () => (author && tryParse<Contact>(author)?.name) || ''
  );
  const tooltip = [`Name: ${title}`, `Shared by: ${authorName || 'Me'}`].join(
    '\n'
  );

  let disabled = true;
  if (hostLink) {
    disabled = false;
  }

  return (
    <li className="shared-notebooks-list-item" title={tooltip}>
      <span className="file-name">
        <span className="icon-wrapper">
          <notebookIcon.react width={20} height={20} />
        </span>
        <div className="item-label">
          <span className="header">{name}</span>
          {authorName && (
            <span className="sub-header">Shared by {authorName}</span>
          )}
        </div>
      </span>
      {!disabled && (
        <span className="button-group">
          <div className="btn-container">
            <button
              type="button"
              title="Open session in separate tab"
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => {
                window.open(hostLink, '_blank')?.focus();
              }}
              className="shared-notebooks-icon-btn"
            >
              <launchIcon.react />
            </button>
          </div>
        </span>
      )}
    </li>
  );
};
