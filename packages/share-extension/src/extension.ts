import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  ClipboardData,
  Clipboard,
  Dialog,
  WidgetTracker,
  MainAreaWidget
} from '@jupyterlab/apputils';
import { URLExt } from '@jupyterlab/coreutils';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { PublishingExtensionClient } from './service';
import { ShareNotebooksWidget } from './share-button';
import { PublishDialog } from './dialog';
import { IPublishedFileMetadata } from './types';
import { html5Icon } from '@jupyterlab/ui-components';
import { IDocumentManager } from '@jupyterlab/docmanager';
import {
  IDefaultFileBrowser,
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';
import { HTMLViewer } from './view';
import { PreviewNotebookModel } from './model';
import { addToolbarExtensions } from './toolbar';

const PLUGIN_ID = '@jupyter_sharing/share-extension';

type Args = {
  shareable_link: ClipboardData;
  id: string;
  author_server_url: string;
};

const previewTracker = new WidgetTracker({
  namespace: 'preview-shared-file'
});

const COPY_LINK = 'Copy link';
const COPY_LINK_NO_CODE = 'Copy link (no-code)';
const COPY_LIVE_LINK = ' Copy Live Link';

namespace CommandIDs {
  export const previewCommandID = 'publishing:download';

  export const shareCommandID = 'publishing:share';
}

const activate = (
  app: JupyterFrontEnd,
  docManager: IDocumentManager,
  fileBrowser: IFileBrowserFactory,
  defaultFileBrowser: IDefaultFileBrowser
): void => {
  console.log(`Apple Notebooks extension activated: ${PLUGIN_ID}`);

  const publishingClient = new PublishingExtensionClient();

  // Add a "Share" button in the top right corner of every notebook
  addToolbarExtensions(app, publishingClient);

  addPreviewCommand(app, docManager, defaultFileBrowser, publishingClient);

  addShareNotebookCommand(app, publishingClient);
};

function addShareNotebookCommand(
  app: JupyterFrontEnd,
  publishingClient: PublishingExtensionClient
) {
  const buttons = [
    Dialog.okButton({
      label: COPY_LINK,
      className: 'copy-link',
      caption: 'Copy link to view notebook'
    }),
    Dialog.okButton({
      label: COPY_LINK_NO_CODE,
      className: 'copy-link-static',
      caption: 'Copy link to view notebook without code cells'
    }),
    Dialog.okButton({
      label: COPY_LIVE_LINK,
      className: 'live-link',
      caption: 'Copy link to live access notebook'
    }),
    Dialog.okButton({
      label: 'Done',
      accept: true,
      displayType: 'default'
    })
  ];

  const actionHandlers = {
    [COPY_LINK]: (_: unknown, value: Args) =>
      Clipboard.copyToSystem(value?.shareable_link),
    [COPY_LINK_NO_CODE]: (_: unknown, value: Args) => {
      Clipboard.copyToSystem(`${value?.shareable_link}&view=nocode` || '');
    },
    [COPY_LIVE_LINK]: (_: unknown, value: Args) => {
      Clipboard.copyToSystem(
        `${URLExt.join(value?.author_server_url, 'collaboration', value.id)}`
      );
    }
  };

  const handleShareExecute = async (args: ReadonlyPartialJSONObject) => {
    const { isReadOnly, title: fileName } = args;
    const title = `${isReadOnly ? 'View' : 'Share'} "${fileName}"`;

    const dialog = new PublishDialog({
      title,
      buttons,
      actionHandlers,
      hasClose: true,
      body: new ShareNotebooksWidget(
        (args as unknown) as IPublishedFileMetadata,
        publishingClient
      )
    });

    const result = await dialog.launch();

    if (result.value && !args.isReadOnly && dialog.isDirty) {
      publishingClient.updateFile(result.value.value);
    }
  };

  app.commands.addCommand(CommandIDs.shareCommandID, {
    isEnabled: () => true,
    isVisible: () => true,
    label: 'Share a notebook',
    execute: handleShareExecute
  });
}

function addPreviewCommand(
  app: JupyterFrontEnd,
  docManager: IDocumentManager,
  defaultFileBrowser: IDefaultFileBrowser,
  publishingClient: PublishingExtensionClient
) {
  const handleExecute = async (args: ReadonlyPartialJSONObject) => {
    const widgetId = args.id as string;
    const fileId: string = (args.id as string) || '';
    const widgetExists = previewTracker.find(w => w.id === widgetId);
    const title = `Preview - ${args.title}`;

    if (widgetExists) {
      return app.shell.activateById(widgetId);
    }

    const renderer = new HTMLViewer(
      new PreviewNotebookModel({
        fileId,
        publishingClient,
        browser: defaultFileBrowser,
        contents: docManager.services.contents,
        fileName: (args.title as string) || 'Untitled.ipynb'
      })
    );

    // Build the "Last Updated" item in the toolbar.
    renderer.addLastUpdatedItem(args);

    const widget = new MainAreaWidget({
      content: renderer,
      //toolbar: renderer.toolbar,
      reveal: renderer.model.isPreviewReady
    });

    widget.id = widgetId;
    widget.title.closable = true;
    widget.title.icon = html5Icon;
    widget.title.label = title;
    widget.title.caption = title;

    previewTracker.add(widget);

    app.shell.add(widget, 'main');
    app.shell.activateById(widget.id);
  };

  app.commands.addCommand(CommandIDs.previewCommandID, {
    isEnabled: () => true,
    isVisible: () => true,
    execute: handleExecute,
    label: 'Open from Shared Link...'
  });
}

export const PublishNotebookPlugin: JupyterFrontEndPlugin<void> = {
  activate,
  autoStart: true,
  id: PLUGIN_ID,
  requires: [IDocumentManager, IFileBrowserFactory, IDefaultFileBrowser]
};
