import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Clipboard } from '@jupyterlab/apputils';

import { SharedNotebooksWidget } from './widget';

import { IPublishedFileMetadata, SharedNotebooksModel } from './model';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';
import { AsyncActionHandler } from '@jupyter_sharing/share-extension';
import { shareIcon } from '@jupyterlab/ui-components';

const PLUGIN_ID = '@jupyter_sharing/shared-extension';

async function activate(
  app: JupyterFrontEnd,
  labShell: ILabShell,
  restorer: ILayoutRestorer
): Promise<void> {
  console.log(`Apple Notebooks extension activated: ${PLUGIN_ID}`);

  const model = new SharedNotebooksModel();

  const onDialogOpen = async (args: unknown) => {
    const { id, title: fileName, isReadOnly } = args as IPublishedFileMetadata;

    const loading = new AsyncActionHandler({
      title: 'Sharing',
      tooltip: `Sharing "${fileName}"`,
      action: model.getFile(id)
    });

    try {
      const data = await loading.start();

      app.commands.execute('publishing:share', ({
        ...data,
        isReadOnly
      } as unknown) as ReadonlyPartialJSONObject);
    } catch (error: any) {
      showErrorMessage('Sharing failed', error);
    }
  };

  const onPreviewFile = (args: unknown) =>
    app.commands.execute(
      'publishing:download',
      args as ReadonlyPartialJSONObject
    );

  const onCopy = (args: unknown) =>
    Clipboard.copyToSystem(`${(args as any)?.shareable_link}` || '');

  const onDialogDelete = async (args: unknown) => {
    const { id, title: fileName } = args as IPublishedFileMetadata;

    showDialog({
      title: 'Are you sure you want to unshare this file?',
      body:
        "You are about to remove '" +
        fileName +
        "' from the publishing service. " +
        'This will automatically unshare this document with all ' +
        'collaborators. Are you sure you want to do this?',
      buttons: [
        Dialog.cancelButton({
          label: 'Cancel',
          displayType: 'default'
        }),
        Dialog.warnButton({
          label: 'Delete File'
        })
      ]
    }).then(async result => {
      // restarts the kernel monitor.
      if (result.button.accept) {
        try {
          await model.deleteFile(id);
        } catch (error: any) {
          showErrorMessage('Failed to remove file.', error);
        }
      }
      return result;
    });
  };

  const sharedNotebooks = new SharedNotebooksWidget(model, {
    onDialogOpen,
    onPreviewFile,
    onDialogDelete,
    onCopy
  });

  sharedNotebooks.title.icon = shareIcon;
  sharedNotebooks.id = 'shared-notebooks';
  sharedNotebooks.title.caption = 'Shared Notebooks';

  labShell.add(sharedNotebooks, 'left', { rank: 700 });

  if (restorer) {
    restorer.add(sharedNotebooks, 'jupyter_sharing:shared_notebooks_plugin');
  }
}

/**
 * Initialization data for the ToC extension.
 *
 * @private
 */
export const ViewSharedNotebooksPlugin: JupyterFrontEndPlugin<void> = {
  activate,
  autoStart: true,
  requires: [ILabShell, ILayoutRestorer],
  id: PLUGIN_ID
};
