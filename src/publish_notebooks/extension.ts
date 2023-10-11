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
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { PublishingExtensionClient } from './service';
import { addWidgetExtension, ShareNotebooksWidget } from './widget';
import { PublishDialog } from './dialog';
import { IPublishedFileMetadata } from './types';
import { html5Icon } from '@jupyterlab/ui-components';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { HTMLViewer } from './view';
import { PreviewNotebookModel } from './model';

type Args = { shareable_link: ClipboardData };

const previewTracker = new WidgetTracker({
  namespace: 'preview-shared-file'
});

const COPY_LINK = 'Copy link';
const COPY_LINK_NO_CODE = 'Copy link (no-code)';

namespace CommandIDs {
  export const previewCommandID = 'publishing:download';

  export const shareCommandID = 'publishing:share';
}

const activate = (
  app: JupyterFrontEnd,
  docManager: IDocumentManager,
  fileBrowser: IFileBrowserFactory
): void => {
  const publishingClient = new PublishingExtensionClient();

  // Add a "Share" button in the top right corner of every notebook
  addWidgetExtension(app, publishingClient);

  addPreviewCommand(app, docManager, fileBrowser, publishingClient);

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
  fileBrowser: IFileBrowserFactory,
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
        browser: fileBrowser.defaultBrowser,
        contents: docManager.services.contents,
        fileName: (args.title as string) || 'Untitled.ipynb'
      })
    );

    // Build the "Last Updated" item in the toolbar.
    renderer.addLastUpdatedItem(args);

    const widget = new MainAreaWidget({
      content: renderer,
      toolbar: renderer.toolbar,
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
  id: 'data_studio:publishing_extension',
  requires: [IDocumentManager, IFileBrowserFactory]
};
