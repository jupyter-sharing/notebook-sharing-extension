import * as React from 'react';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { NotebookPanel, INotebookModel } from '@jupyterlab/notebook';
import { LabIcon } from '@jupyterlab/ui-components';
import {
  ReactWidget,
  ToolbarButtonComponent,
  UseSignal
} from '@jupyterlab/apputils';
import { Signal } from '@lumino/signaling';

export type CollaborationToolbarExtension = DocumentRegistry.IWidgetExtension<
  NotebookPanel,
  INotebookModel
>;

export interface ICollaborationButtonProps {
  onClick: () => void;
  icon: LabIcon;
  signal: Signal<any, boolean>;
  pressedIcon: LabIcon;
}

export class CollaborationButtonWidget extends ReactWidget {
  constructor(private props: ICollaborationButtonProps) {
    super();
  }

  // Update the lastShared value.
  setState(collaborationEnabled: boolean, buttonEnabled: boolean): void {
    this.collaborationEnabled = collaborationEnabled;
    this.buttonEnabled = buttonEnabled;
    this.update();
  }

  render(): JSX.Element {
    let tooltip = 'Collaboration mode: disabled';
    if (this.collaborationEnabled) {
      tooltip = 'Collaboration mode: enabled';
    }
    // If the button is disabled, it's because the document has never
    // been shared before. Let's mention that here.
    if (!this.buttonEnabled) {
      tooltip =
        'The document must be shared before real-time collaboration is enabled.';
    }
    return (
      <UseSignal signal={this.props.signal}>
        {(_, enabled) => {
          return (
            <ToolbarButtonComponent
              className="jp-collaboration-button"
              label=""
              {...this.props}
              pressed={this.collaborationEnabled}
              enabled={this.buttonEnabled}
              tooltip={tooltip}
            />
          );
        }}
      </UseSignal>
    );
  }

  public collaborationEnabled: boolean | undefined;
  public buttonEnabled: boolean = false;
}
