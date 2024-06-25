import { JupyterFrontEnd } from '@jupyterlab/application';
import { PublishingExtensionClient } from './service';
import { AsyncActionHandler } from './loading_dialog';
import { IJupyterContentsModel, IPublishedFileMetadata } from './types';
import { shareIcon } from '@jupyterlab/ui-components';
import { showErrorMessage } from '@jupyterlab/apputils';
import { NotebookPanel, INotebookModel } from '@jupyterlab/notebook';
import { IDisposable, DisposableDelegate } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { ShareButtonWidget } from './share-button';
import { requestAPI } from '@jupyter_sharing/core';
import { CollaborationButtonWidget } from './collaboration-button';
import { usersIcon } from '@jupyterlab/ui-components';

type SharingToolbarExtension = DocumentRegistry.IWidgetExtension<
  NotebookPanel,
  INotebookModel
>;

/*
  // Trigger a (async) Promise that fetches this information from
  // the server.
*/
export async function fetchShared(
  panel: NotebookPanel,
  shareButton: ShareButtonWidget,
  collaborateButton: CollaborationButtonWidget
): Promise<IPublishedFileMetadata | void> {
  // Fetch from the server.
  let path: string = panel.context.path;
  // Remove RTC drive if present.
  if (path.startsWith('RTC:')) {
    path = path.substring(4);
  }
  try {
    const metadata: IPublishedFileMetadata | null = await requestAPI(
      'publishing/file?path=' + encodeURIComponent(path)
    );

    // Get the time the document was last shared.
    // If a valid response comes back, the file was found.
    // Use the lastmodified field to set the
    if (metadata) {
      // Create a human-readable date.
      shareButton.setState(new Date(Number(metadata.last_modified)));
      let liveEnabled = false;
      if (metadata.liveEnabled) {
        liveEnabled = metadata.liveEnabled;
      }
      collaborateButton.setState(liveEnabled, true);
      return metadata;
    }
  } catch (err) {
    console.log(err);
  }
}

/**
 * A Set of toolbar items for sharing and collaboration
 */
export class SharingToolbarItems implements SharingToolbarExtension {
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
  }

  /**
   * Create a new extension for the notebook panel widget.
   *
   * @param panel Notebook panel
   * @param context Notebook context
   * @returns Disposable on the added button
   */
  createNew(panel: NotebookPanel): IDisposable {
    let shareClickedSignal = new Signal(() => {
      return true;
    });

    let _shareButton = new ShareButtonWidget({
      signal: this.signal,
      className: 'create-shareable-link',
      tooltip: 'Publish and create a shareable link',
      icon: shareIcon.bindprops({ stylesheet: 'menuItem' }),
      onClick: async (): Promise<void> => {
        const contentModelJSON = panel.content.model?.toJSON() || [];
        const content = contentModelJSON as any;
        const model: IJupyterContentsModel = {
          ...panel.context.contentsModel,
          content: content
        };

        this.signal.emit(true);
        shareClickedSignal.emit(true);

        try {
          const loading = new AsyncActionHandler({
            title: 'Sharing',
            tooltip: `Sharing "${panel.title.label}"`,
            action: this.publishingClient.publishFile(model)
          });

          const data = await loading.start();

          this._app.commands.execute('publishing:share', data as any);

          // Update the button's "Last Updated" field.
          if (_shareButton) {
            _shareButton.setState(new Date(Number(data.last_modified)));
          }
        } catch (error: any) {
          showErrorMessage('Sharing failed', error);
        }

        this.signal.emit(false);
      }
    });

    // Build the button.
    let _collaborationButton = new CollaborationButtonWidget({
      signal: this.signal,
      icon: usersIcon,
      pressedIcon: usersIcon,
      onClick: async () => {
        // Fetch from the server.
        let path: string = panel.context.path;
        // Remove RTC drive if present.
        if (path.startsWith('RTC:')) {
          path = path.substring(4);
        }

        let actionText = !_collaborationButton.collaborationEnabled
          ? 'Enabling'
          : 'Disabling';

        const loading = new AsyncActionHandler({
          title: `${actionText} real-time-collaboration`,
          tooltip: `${actionText} RTC in "${panel.title.label}"`,
          action: requestAPI(
            'publishing/file?path=' +
              encodeURIComponent(path) +
              '&collaborators=1'
          )
        });

        const data = await loading.start();
        let metadata = data as IPublishedFileMetadata;

        // Check if there are any collaborators.
        if (
          // If we're disabling the button, then we don't care.
          !_collaborationButton.collaborationEnabled &&
          // If the collaborator list only has the owner, raise the "share"
          // modal to ask for collaborators.
          (!metadata.collaborators || metadata.collaborators.length <= 1)
        ) {
          this._app.commands.execute('publishing:share', metadata as any);
        }

        // Switch the liveEnabled value if present, otherwise default to false;
        let newState = !metadata.liveEnabled || false;

        const loading2 = new AsyncActionHandler({
          title: `${actionText} real-time-collaboration`,
          tooltip: `${actionText} RTC in "${panel.title.label}"`,
          action: this.publishingClient.updateFile({
            id: metadata.id,
            author: metadata.author,
            liveEnabled: newState
          })
        });

        await loading2.start();
        _collaborationButton.setState(newState, true);
      }
    });

    shareClickedSignal.connect(() => {
      let enabled = false;
      if (_collaborationButton.collaborationEnabled) {
        enabled = _collaborationButton.collaborationEnabled;
      }
      _collaborationButton.setState(enabled, true);
    });

    if (_shareButton) {
      panel.toolbar.insertBefore('kernelName', 'shareableLink', _shareButton);
      panel.toolbar.insertBefore(
        'kernelName',
        'collaboration',
        _collaborationButton
      );
      fetchShared(panel, _shareButton, _collaborationButton);
    }

    // Poll the status of last shared every 30 seconds.
    const poller = setInterval(() => {
      _shareButton?.setState(null);
    }, 30000);

    return new DisposableDelegate(() => {
      if (_shareButton) {
        _shareButton.dispose();
      }
      if (_collaborationButton) {
        _collaborationButton.dispose();
      }
      // Stop the interval poller when the
      // notebook panel is disposed.
      clearInterval(poller);
    });
  }

  private _app: JupyterFrontEnd;
  public signal = new Signal<SharingToolbarItems, boolean>(this);
}

// Add toolbar items for sharing to the
// Notebook toolbar.
export function addToolbarExtensions(
  app: JupyterFrontEnd,
  publishingClient: PublishingExtensionClient
): void {
  let buttons = new SharingToolbarItems(app, publishingClient);
  app.docRegistry.addWidgetExtension('Notebook', buttons);
}
