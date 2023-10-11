import React, { useState, useRef } from 'react';
import { notebookIcon, linkIcon, deleteIcon } from '@jupyterlab/ui-components';
import { tryParse } from '../../publish_notebooks/utils';
import { Contact } from '../../publish_notebooks/types';
import { shareIcon, previewIcon } from '../icons';
import { Time } from '@jupyterlab/coreutils';

type ListItemProps = {
  name: string;
  title: string;
  author?: string;
  modifiedOn: string;
  onCopy: () => void;
  onPreview: () => void;
  onShare?: () => void;
  onDelete?: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const NOOP = () => {};

// TODO: This does not cover all cases but it works for our usecase
const isValidDate = (date: number) =>
  date && date > 0 && new Date(date).toString() !== 'Invalid Date';

export const ListItem: React.FC<ListItemProps> = ({
  name,
  title,
  author,
  modifiedOn,
  onDelete,
  onPreview = NOOP,
  onShare = NOOP,
  onCopy = NOOP
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [authorName] = useState(
    () => (author && tryParse<Contact>(author)?.name) || ''
  );
  const tooltip = [
    `Name: ${title}`,
    `Shared by: ${authorName || 'Me'}`,
    `On: ${new Date().toLocaleString()}`
  ].join('\n');

  const toggleMessage = (show: boolean) => {
    if (ref.current) {
      ref.current.style.display = show ? 'block' : 'none';
    }
  };

  const handleCopy = () => {
    if (ref.current) {
      toggleMessage(true);
      setTimeout(() => toggleMessage(false), 500);
    }

    onCopy();
  };

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
      <span className="button-group">
        <div className="btn-container">
          <button
            type="button"
            title="Preview"
            aria-disabled="false"
            onClick={onPreview}
            className="shared-notebooks-icon-btn"
          >
            <previewIcon.react />
          </button>
          <button
            type="button"
            title="Get link"
            aria-disabled="false"
            onClick={handleCopy}
            className="shared-notebooks-icon-btn"
          >
            <linkIcon.react />
            <span ref={ref} className="notify">
              Link copied
            </span>
          </button>
          <button
            type="button"
            title="Re-Share"
            aria-disabled="false"
            onClick={onShare}
            className="shared-notebooks-icon-btn"
          >
            <shareIcon.react />
          </button>
          {onDelete && (
            <button
              type="button"
              title="Remove shared file"
              aria-disabled="false"
              onClick={onDelete}
              className="shared-notebooks-icon-btn"
            >
              <deleteIcon.react />
            </button>
          )}
        </div>
        <p className="modified-date">
          {isValidDate(+modifiedOn)
            ? Time.formatHuman(new Date(Number(modifiedOn)))
            : null}
        </p>
      </span>
    </li>
  );
};
