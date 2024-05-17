import React, { useEffect, useState, useCallback } from 'react';
import {
  refreshIcon,
  caretDownIcon,
  caretUpIcon,
  FilterBox,
  IScore
} from '@jupyterlab/ui-components';
import { ResponseModel } from '../model';
import { SharedNotebooksList } from './list';
import { ListItem } from './list_item';
import { RTCListItem } from './rtc_list_item';
import { Time, URLExt } from '@jupyterlab/coreutils';
import { sorter } from '../utils';

type SharedNotebooksProp = {
  onCopy: (...args: unknown[]) => void;
  onShare: (...args: unknown[]) => void;
  onPreview: (...args: unknown[]) => void;
  onDelete: (...args: unknown[]) => void;
  onRefresh: () => void;
  notebooks?: ResponseModel;
};

export const SharedNotebooks: React.FC<SharedNotebooksProp> = ({
  notebooks,
  onShare,
  onRefresh,
  onPreview,
  onDelete,
  onCopy
}) => {
  const [syncTime, setSyncTime] = useState<Date>();
  const [key, setKey] = useState<number>(0);
  const [sharedNotebooks, setSharedNotebooks] = useState<ResponseModel>();
  const [sortOption, setSortOption] = useState({
    column: 'last_modified',
    desc: true
  });

  useEffect(() => onRefresh(), []);

  useEffect(() => {
    const { sharedByMe = [], sharedWithMe = [] } = notebooks || {};
    const myNotebooks = sharedByMe.sort(sorter(sortOption));
    const othersNotebooks = sharedWithMe.sort(sorter(sortOption));

    setKey(key => key + 1);
    setSyncTime(new Date());
    setSharedNotebooks({
      sharedByMe: myNotebooks,
      sharedWithMe: othersNotebooks
    });
  }, [notebooks]);

  const updateFilter = useCallback(
    (filterFunc: (item: string) => boolean | Partial<IScore> | null) => {
      const { sharedByMe = [], sharedWithMe = [] } = notebooks || {};

      const myNotebooks = sharedByMe
        .filter(item => filterFunc(item.title))
        .sort(sorter(sortOption));

      const othersNotebooks = sharedWithMe
        .filter(item => filterFunc(item.title))
        .sort(sorter(sortOption));

      setSharedNotebooks({
        sharedByMe: myNotebooks,
        sharedWithMe: othersNotebooks
      });
    },
    [sortOption, notebooks]
  );

  const handleSort = (name: string) => {
    const { column, desc } = sortOption;
    const { sharedByMe = [], sharedWithMe = [] } = sharedNotebooks || {};
    const nextState = {
      column: name,
      desc: column === name ? !desc : desc
    };

    setSortOption(nextState);
    setSharedNotebooks({
      sharedByMe: sharedByMe.sort(sorter(nextState)),
      sharedWithMe: sharedWithMe.sort(sorter(nextState))
    });
  };

  let myRTCSessions: Array<any> | undefined;
  let myRTCSessionCount = 0;
  if (sharedNotebooks) {
    myRTCSessions = sharedNotebooks?.sharedWithMe.filter((item: any) => {
      if (item.liveEnabled) {
        return item;
      }
    });
    if (myRTCSessions) {
      myRTCSessionCount = myRTCSessions?.length;
    }
  }

  const sortIcon = sortOption.desc ? (
    <caretDownIcon.react className="icon" />
  ) : (
    <caretUpIcon.react className="icon" />
  );

  return (
    <div
      role="region"
      className="lm-Widget p-Widget shared-notebooks"
      aria-label="Shared Notebooks section"
    >
      <div className="shared-notebooks-header">
        <span className="shared-notebooks-item-label" title="Shared Notebooks">
          Shared Notebooks
        </span>
        <button
          type="button"
          title="Refresh List"
          aria-disabled="false"
          className="shared-notebooks-icon-btn"
          onClick={onRefresh}
        >
          <refreshIcon.react />
        </button>
      </div>
      <div className="filter-wrapper">
        <FilterBox
          key={key}
          caseSensitive={false}
          useFuzzyFilter={false}
          updateFilter={updateFilter}
          placeholder="Filter shared notebooks"
        />
      </div>
      <div className="sort-header">
        <div
          className="sort-header-item"
          onClick={handleSort.bind(null, 'title')}
        >
          <span>Name</span>
          {sortOption.column === 'title' ? sortIcon : null}
        </div>
        <div
          className="sort-header-item"
          onClick={handleSort.bind(null, 'last_modified')}
        >
          {sortOption.column === 'last_modified' ? sortIcon : null}
          <span>Last Modified</span>
        </div>
      </div>
      <SharedNotebooksList
        title="Shared by me"
        count={sharedNotebooks?.sharedByMe.length || 0}
      >
        {sharedNotebooks?.sharedByMe?.map((item: any, index: number) => (
          <ListItem
            key={index}
            name={item.title}
            title={item.title}
            modifiedOn={item.last_modified}
            onCopy={onCopy.bind(null, item)}
            onPreview={onPreview.bind(null, item)}
            onShare={onShare.bind(null, item)}
            onDelete={onDelete.bind(null, item)}
          />
        ))}
      </SharedNotebooksList>
      <SharedNotebooksList
        title="Shared with me"
        count={sharedNotebooks?.sharedWithMe.length || 0}
      >
        {sharedNotebooks?.sharedWithMe?.map((item: any, index: number) => (
          <ListItem
            key={index}
            name={item.title}
            title={item.title}
            author={item.author}
            modifiedOn={item.last_modified}
            onCopy={onCopy.bind(null, item)}
            onPreview={onPreview.bind(null, item)}
            onShare={onShare.bind(null, { ...item, isReadOnly: true })}
          />
        ))}
      </SharedNotebooksList>
      <SharedNotebooksList title="Real-time Sessions" count={myRTCSessionCount}>
        {myRTCSessions?.map((item: any, index: number) => (
          <RTCListItem
            key={index}
            name={item.title}
            title={item.title}
            author={item.author}
            fileId={item.id}
            hostLink={
              item.author_server_url
                ? URLExt.join(item.author_server_url, 'collaboration', item.id)
                : undefined
            }
          />
        ))}
      </SharedNotebooksList>
      <div className="sync-status">
        <p>Last successful sync:</p>
        {syncTime && <p>{Time.format(syncTime)}</p>}
      </div>
    </div>
  );
};
