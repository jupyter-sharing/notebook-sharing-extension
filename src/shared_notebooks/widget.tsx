import * as React from 'react';
import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
import { Message } from '@lumino/messaging';
import { SharedNotebooksModel } from './model';
import { SharedNotebooks } from './components';

type Handlers = {
  onCopy: (args: unknown) => void;
  onDialogOpen: (args: unknown) => void;
  onPreviewFile: (args: unknown) => void;
  onDialogDelete: (args: unknown) => void;
};
export class SharedNotebooksWidget extends ReactWidget {
  handleClick: (args: unknown) => void;
  handleOpenDialog: (args: unknown) => void;
  handlePreviewFile: (args: unknown) => void;
  handleDelete: (args: unknown) => void;
  handleCopy: (args: unknown) => void;

  constructor(
    model: SharedNotebooksModel,
    { onDialogOpen, onPreviewFile, onDialogDelete, onCopy }: Handlers
  ) {
    super();

    this._model = model;
    this.handleOpenDialog = onDialogOpen;
    this.handlePreviewFile = onPreviewFile;
    this.handleClick = this._handleClick.bind(this);
    this.handleDelete = onDialogDelete;
    this.handleCopy = onCopy;
  }

  protected onAfterAttach(msg: Message): void {
    this._model.refresh.bind(this._model)();
  }

  /**
   * Callback invoked to re-render after showing a table of contents.
   *
   * @param msg - message
   */
  protected onAfterShow(msg: Message): void {
    this.update();
  }

  private async _handleClick(args: unknown) {
    this.handleOpenDialog(args);
  }

  /**
   * Callback invoked upon an update request.
   *
   * @param msg - message
   */
  protected render(): JSX.Element {
    return (
      <UseSignal signal={this._model.stateChanged}>
        {(_, state): JSX.Element => {
          return (
            <SharedNotebooks
              notebooks={state}
              onShare={this.handleOpenDialog}
              onPreview={this.handlePreviewFile}
              onRefresh={this._model.refresh.bind(this._model)}
              onDelete={this.handleDelete}
              onCopy={this.handleCopy}
            />
          );
        }}
      </UseSignal>
    );
  }

  private _model: SharedNotebooksModel;
}
