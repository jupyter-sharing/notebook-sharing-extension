import * as React from 'react';
import { IDisposable, DisposableDelegate } from '@lumino/disposable';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { NotebookPanel, INotebookModel } from '@jupyterlab/notebook';
import shareIconSvg from '../../style/icons/share_icon.svg';
import {
  ReactWidget,
  showErrorMessage,
  ToolbarButtonComponent,
  UseSignal
} from '@jupyterlab/apputils';
import { PublishingExtensionClient } from './service';
import { LabIcon } from '@jupyterlab/ui-components';
import { JupyterFrontEnd } from '@jupyterlab/application';
import {
  Contact,
  IJupyterContentsModel,
  IShareDialogBody,
  IPublishedFileMetadata
} from './types';
import { ShareNotebooksComponent } from './components';
import { map, toArray } from '@lumino/algorithm';
import { tryParse } from './utils';
import { AsyncActionHandler } from './loading_dialog';
import { requestAPI } from '../handler';
import { Signal } from '@lumino/signaling';
import { Time } from '@jupyterlab/coreutils';


type ShareToolbarExtension = DocumentRegistry.IWidgetExtension<
  NotebookPanel,
  INotebookModel
>;

const ERROR_MSG = 'One or more of the emails provided are invalid';

const shareIcon = new LabIcon({
  name: 'publish:shareIcon',
  svgstr: shareIconSvg
});

export class ShareNotebooksWidget extends ReactWidget {
  constructor(
    data: IPublishedFileMetadata,
    publishingClient: PublishingExtensionClient
  ) {
    super();
    this._value = [];
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
      this._value.length &&
      (this._value.length !== collaborators.length ||
        this._value.some(item => !collaborators.includes(item.id)));

    const isInvalid = this._value.some(d => !d.id || !d.email);

    return {
      value: {
        ...this._data,
        collaborators: this._value
      },
      formState: {
        isDirty,
        isValid: !isInvalid,
        error: isInvalid ? ERROR_MSG : null
      }
    } as IShareDialogBody;
  }

  handleChange(value: Contact[]): void {
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
  _value: Contact[];
  _isReadOnly = false;
  _data: IPublishedFileMetadata;
  private _publishingClient: PublishingExtensionClient;
}

interface IShareButtonProps {
  onClick: () => void;
  className: string;
  tooltip: string;
  icon: LabIcon;
  signal: Signal<ShareToolbarItem, boolean>;
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

/*
  // Trigger a (async) Promise that fetches this information from
  // the server.
*/
export async function fetchShared(
  panel: NotebookPanel,
  button: ShareButtonWidget
): Promise<void> {
  // Fetch from the server.
  const path: string = panel.context.path;

  try {
    const metadata: IPublishedFileMetadata | null = await requestAPI(
      'publishing/file?path=' + encodeURIComponent(path)
    );

    // Get the time the document was last shared.
    // If a valid response comes back, the file was found.
    // Use the lastmodified field to set the
    if (metadata) {
      // Create a human-readable date.
      return button.setState(new Date(Number(metadata.last_modified)));
    }
  } catch (err) {
    console.log(err);
  }
}

export class ShareToolbarItem implements ShareToolbarExtension {
  /*
    REST API client for the Publishing Server Extension.
  */
  public publishingClient: PublishingExtensionClient;

  constructor(
    app: JupyterFrontEnd,
    publishingClient: PublishingExtensionClient
  ) {
    this._app = app;
    this.publishingClient = publishingClient;
    this._button = null;
  }

  /**
   * Create a new extension for the notebook panel widget.
   *
   * @param panel Notebook panel
   * @param context Notebook context
   * @returns Disposable on the added button
   */
  createNew(panel: NotebookPanel): IDisposable {
    const handleClick = async () => {
      const contentModelJSON = panel.content.model?.toJSON() || [];
      const content = contentModelJSON as any;
      const model: IJupyterContentsModel = {
        ...panel.context.contentsModel,
        content: content
      };

      this.signal.emit(true);

      try {
        const loading = new AsyncActionHandler({
          title: 'Sharing',
          tooltip: `Sharing "${panel.title.label}"`,
          action: this.publishingClient.publishFile(model)
        });

        const data = await loading.start();

        this._app.commands.execute('publishing:share', data as any);

        // Update the button's "Last Updated" field.
        if (this._button) {
          this._button.setState(new Date(Number(data.last_modified)));
        }
      } catch (error) {
        showErrorMessage('Sharing failed', error);
      }

      this.signal.emit(false);
    };

    this._button = new ShareButtonWidget({
      signal: this.signal,
      onClick: handleClick,
      className: 'create-shareable-link',
      tooltip: 'Publish and create a shareable link',
      icon: shareIcon.bindprops({ stylesheet: 'menuItem' })
    });

    if (this._button) {
      panel.toolbar.insertItem(9, 'shareableLink', this._button);

      fetchShared(panel, this._button);
    }

    // Poll the status of last shared every 30 seconds.
    const poller = setInterval(() => {
      this._button?.setState(null);
    }, 30000);

    return new DisposableDelegate(() => {
      if (this._button) {
        this._button.dispose();
      }
      // Stop the interval poller when the
      // notebook panel is disposed.
      clearInterval(poller);
    });
  }

  private _app: JupyterFrontEnd;
  private _button: ShareButtonWidget | null;
  private signal = new Signal<ShareToolbarItem, boolean>(this);
}

// Add toolbar items for sharing to the
// Notebook toolbar.
export function addWidgetExtension(
  app: JupyterFrontEnd,
  publishingClient: PublishingExtensionClient
): void {
  // Add a "Share" button in the top right corner of every notebook
  app.docRegistry.addWidgetExtension(
    'Notebook',
    new ShareToolbarItem(app, publishingClient)
  );
}
