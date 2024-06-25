import * as React from 'react';
import {
  ReactWidget,
  ToolbarButtonComponent,
  UseSignal
} from '@jupyterlab/apputils';
import { PublishingExtensionClient } from './service';
import { LabIcon } from '@jupyterlab/ui-components';
import {
  Contact,
  IShareDialogBody,
  IPublishedFileMetadata,
  ICollaborator
} from './types';
import { ShareNotebooksComponent } from './components';
import { map, toArray } from '@lumino/algorithm';
import { tryParse } from './utils';
import { Signal } from '@lumino/signaling';
import { Time } from '@jupyterlab/coreutils';

const ERROR_MSG = 'One or more of the emails provided are invalid';

export class ShareNotebooksWidget extends ReactWidget {
  constructor(
    data: IPublishedFileMetadata,
    publishingClient: PublishingExtensionClient
  ) {
    super();
    this._value = data.collaborators || [];
    this._liveEnabled = data.liveEnabled ?? false;
    this._data = data;
    this._isReadOnly = Boolean(data.isReadOnly);
    this.handleChange = this.handleChange.bind(this);
    this._publishingClient = publishingClient;
    this._author = tryParse<Contact>(this._data.author);
  }

  getValue(): IShareDialogBody {
    const collaborators = toArray(
      map(this._data.collaborators || [], v => v.id)
    );

    // Collaborators list has been modified set the dirty flag
    // This flag will be used when closing the dialog
    const isDirty =
      this._liveEnabled !== this._data.liveEnabled ||
      this._value.length !== collaborators.length ||
      this._value.some(item => !collaborators.includes(item.id)) ||
      this._value.some(item =>
        this._data.collaborators?.some(
          d =>
            d.id == item.id &&
            d.permissions?.sort().join(',') !=
              item.permissions?.sort().join(',')
        )
      );

    const isInvalid = this._value.some(d => !d.id || !d.email);

    return {
      value: {
        ...this._data,
        collaborators: this._value,
        liveEnabled: this._liveEnabled
      },
      formState: {
        isDirty,
        isValid: !isInvalid,
        error: isInvalid ? ERROR_MSG : null
      }
    } as IShareDialogBody;
  }

  handleChange(value: ICollaborator[]): void {
    this._value = value;
  }

  render(): JSX.Element {
    return (
      <ShareNotebooksComponent
        isReadOnly={this._isReadOnly}
        onChange={this.handleChange}
        author={this._author}
        client={this._publishingClient}
        collaborators={this._data.collaborators || []}
      />
    );
  }

  _author: Contact;
  _value: ICollaborator[];
  _liveEnabled: boolean;
  _isReadOnly = false;
  _data: IPublishedFileMetadata;
  private _publishingClient: PublishingExtensionClient;
}

interface IShareButtonProps {
  onClick: () => void;
  className: string;
  tooltip: string;
  icon: LabIcon;
  signal: Signal<any, boolean>;
}

export class ShareButtonWidget extends ReactWidget {
  constructor(private props: IShareButtonProps) {
    super();
  }

  // Update the lastShared value.
  setState(lastShared: Date | null): void {
    if (lastShared !== null) {
      this.lastShared = lastShared;
    }

    this.update();
  }

  render(): JSX.Element {
    // If a string is given, use it as the value for
    // last shared.
    const label =
      this.lastShared instanceof Date
        ? 'Share (updated ' + Time.formatHuman(this.lastShared) + ')'
        : 'Share';

    return (
      <UseSignal signal={this.props.signal}>
        {(_, enabled) => {
          return (
            <ToolbarButtonComponent
              label={label}
              {...this.props}
              enabled={!enabled}
            />
          );
        }}
      </UseSignal>
    );
  }

  private lastShared: Date | null = null;
}
