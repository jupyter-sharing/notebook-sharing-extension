import { ISignal, Signal } from '@lumino/signaling';
import { IDisposable } from '@lumino/disposable';
import { Contents } from '@jupyterlab/services';
import { FileBrowser } from '@jupyterlab/filebrowser';
import { PromiseDelegate } from '@lumino/coreutils';
import { generateFileName } from './utils';
import { map, toArray } from '@lumino/algorithm';
import { InputDialog } from '@jupyterlab/apputils';
import { PathExt, URLExt } from '@jupyterlab/coreutils';
import { PublishingExtensionClient } from './service';
import { IPreviewFileResponse } from './types';
import { AsyncActionHandler } from './loading_dialog';

type PublishNotebookOptions = {
  fileId: string;
  fileName: string;
  browser: FileBrowser;
  contents: Contents.IManager;
  publishingClient: PublishingExtensionClient;
};

export class PreviewNotebookModel implements IDisposable {
  constructor(private options: PublishNotebookOptions) {}

  /**
   * Get whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  get savingNotebookSignal(): ISignal<PreviewNotebookModel, boolean> {
    return this._savingNotebook;
  }

  get savingHTMLSignal(): ISignal<PreviewNotebookModel, boolean> {
    return this._savingHTML;
  }

  get isPreviewReady(): Promise<void> {
    return this._previewReady.promise;
  }

  get data(): string {
    return this._data;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this._isDisposed = true;

    Signal.clearData(this);
  }

  private async getFileName(defaultName: string): Promise<string | null> {
    const { browser } = this.options;

    const existingFiles: string[] = toArray(
      map(browser.model.items(), value => value.name)
    );

    const tempName = generateFileName(defaultName, existingFiles);

    const result = await InputDialog.getText({
      title: 'Save as',
      text: tempName
    });

    if (!result.value) {
      return null;
    }

    return result.value;
  }

  async saveToWorkspace(): Promise<void> {
    const { contents, browser } = this.options;
    const tempName = await this.getFileName('Untitled.html');

    if (!tempName) {
      return;
    }

    try {
      this._savingHTML.emit(true);
      const options: Partial<Contents.IModel> = {
        type: 'file',
        format: 'text',
        content: this._data,
        mimetype: 'text/html',
        path: browser.model.path
      };

      const loader = new AsyncActionHandler({
        title: 'Saving...',
        action: contents.save(
          PathExt.join(browser.model.path, tempName),
          options
        ),
        failureMessage: 'Failed to save',
        successMessage: 'Saved successfully'
      });

      await loader.start();
    } catch (e: any) {
      console.log(e);
    }

    this._savingHTML.emit(false);
  }

  async saveNotebookToWorkspace(): Promise<void> {
    const { fileId, publishingClient, browser, fileName } = this.options;
    const tempName = await this.getFileName(fileName);

    if (!tempName) {
      return;
    }

    try {
      const options = {
        id: fileId,
        path: URLExt.join(browser.model.path, tempName)
      };

      const loader = new AsyncActionHandler({
        title: 'Saving...',
        failureMessage: 'Failed to save',
        successMessage: 'Saved successfully',
        action: publishingClient.download(options)
      });

      this._savingNotebook.emit(true);
      await loader.start();
    } catch (e: any) {
      console.log(e);
    }

    this._savingNotebook.emit(false);
  }

  async fetchSharedNotebook(): Promise<void> {
    const { publishingClient, fileId } = this.options;
    try {
      const response: IPreviewFileResponse = await publishingClient.previewFile(
        fileId
      );
      this._data = response.html;
    } catch (error) {
      this._data = (error as any).message as string;
    }

    this._previewReady.resolve();
  }

  private _data = '';
  private _isDisposed = false;
  private _previewReady = new PromiseDelegate<void>();
  private _savingNotebook = new Signal<PreviewNotebookModel, boolean>(this);
  private _savingHTML = new Signal<PreviewNotebookModel, boolean>(this);
}
