import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  IFrame,
  ReactWidget,
  ToolbarButton,
  ToolbarButtonComponent,
  UseSignal,
  Toolbar
} from '@jupyterlab/apputils';
import { downloadIcon, ReactiveToolbar } from '@jupyterlab/ui-components';
import { ISignal } from '@lumino/signaling';
import { StackedPanel, Widget } from '@lumino/widgets';
import * as React from 'react';
import { PreviewNotebookModel } from './model';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import {
  getCSSTemplate,
  getPopupTemplate,
  jsTemplate,
  tryParse
} from './utils';
import { Contact } from './types';

/**
 * The CSS class to add to the HTMLViewer Widget.
 */
const CSS_CLASS = 'jp-shared-notebook-HTMLViewer';

export class HTMLViewer extends StackedPanel {
  public toolbar: ReactiveToolbar;

  /**
   * Create a new widget for rendering HTML.
   */
  constructor(private _model: PreviewNotebookModel) {
    super();

    this.content = new IFrame({
      sandbox: ['allow-scripts']
    });

    this._model = _model;
    this.translator = nullTranslator;
    this.content.addClass(CSS_CLASS);
    this.addWidget(this.content);
    this.toolbar = new ReactiveToolbar();

    const saveToWorkspaceButton = ToolbarItems.createSaveHTMLToWorkspaceButton(
      this
    );
    const saveNBToWorkspaceButton = ToolbarItems.createSaveNBToWorkspaceButton(
      this
    );

    this.toolbar.addClass('jp-shared-notebook-toolbar');
    this.toolbar.addItem('save-html', saveToWorkspaceButton);
    this.toolbar.addItem('save-nb', saveNBToWorkspaceButton);
    this.toolbar.addItem('preview-toolbar-spacer', Toolbar.createSpacerItem());

    this._model
      .fetchSharedNotebook()
      .then(this._renderModel.bind(this))
      .catch(this._renderModel.bind(this));
  }

  /**
   * Add File metadata to the toolbar.
   */
  addLastUpdatedItem(metadata: ReadonlyPartialJSONObject): void {
    // Add the shared file's metadata to the toolbar
    // Get the author name.
    let authorName = 'Unknown';
    let lastModified: string;

    if (metadata.author) {
      const authorModel = tryParse<Contact>(metadata.author.toString());

      if (authorModel.name) {
        authorName = authorModel.name;
      }
    }

    // Get the time the document was last shared.
    const lastModifiedStr = metadata.last_modified?.toString();

    if (lastModifiedStr !== undefined) {
      lastModified = new Date(Number(lastModifiedStr)).toLocaleString();
    } else {
      lastModified = 'Unknown';
    }

    const lastModifiedButton = new ToolbarButton({
      label: 'Last updated: ' + lastModified,
      enabled: true,
      onClick: undefined,
      tooltip: 'Updated by ' + authorName + ' on ' + lastModified
    });

    this.toolbar.addItem('lastModified', lastModifiedButton);
  }

  get data(): string {
    return this.model.data;
  }

  get model(): PreviewNotebookModel {
    return this._model;
  }

  private _revokeURL(url: string): void {
    if (!url) {
      return;
    }

    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      /* no-op */
    }
  }

  /**
   * Dispose of resources held by the html viewer.
   */
  dispose(): void {
    this._revokeURL(this._objectUrl);
    super.dispose();
  }

  /**
   * Handle and update request.
   */
  protected onUpdateRequest(): void {
    if (this._renderPending) {
      return;
    }

    this._renderPending = true;

    void this._renderModel().then(() => (this._renderPending = false));
  }

  /**
   * Render HTML in IFrame into this widget's node.
   */
  private async _renderModel(): Promise<void> {
    const data = await this._setBase(this.model.data);

    // Set the new iframe url.
    const blob = new Blob([data], { type: 'text/html' });
    const oldUrl = this._objectUrl;

    this._objectUrl = URL.createObjectURL(blob);
    this.content.url = this._objectUrl;

    // Release reference to any previous object url.
    this._revokeURL(oldUrl);
  }

  private addPopup(doc: Document) {
    // Some random number to make the injected content unique
    const nonce = Date.now();
    const script = document.createElement('script');
    script.appendChild(document.createTextNode(jsTemplate(nonce)));

    const popup = document.createElement('div');
    popup.innerHTML = getPopupTemplate(nonce);

    const style = document.createElement('style');
    style.appendChild(document.createTextNode(getCSSTemplate(nonce)));

    doc.head.appendChild(style);
    doc.body.appendChild(popup);
    doc.body.appendChild(script);
  }

  /**
   * Set a <base> element in the HTML string so that the iframe
   * can correctly dereference relative links.
   */
  private async _setBase(data: string): Promise<string> {
    const doc = this._parser.parseFromString(data, 'text/html');
    let base = doc.querySelector('base');

    if (!base) {
      base = doc.createElement('base');
      doc.head.insertBefore(base, doc.head.firstChild);
    }

    this.addPopup(doc);

    // Set the base href, plus a fake name for the url of this
    // document. The fake name doesn't really matter, as long
    // as the document can dereference relative links to resources
    // (e.g. CSS and scripts).
    // TODO: Find out if this is required
    // base.href = this.model.path;
    base.target = '_blank';

    return doc.documentElement.innerHTML;
  }

  private content: IFrame;
  private _objectUrl = '';
  private _renderPending = false;
  private _parser = new DOMParser();
  protected translator: ITranslator;
}

/**
 * A namespace for toolbar items generator
 */
export namespace ToolbarItems {
  /**
   * Create the save button
   *
   * @param view HTML viewer widget
   * @param translator Application translator object
   * @returns Toolbar item button
   */
  export function createSaveNBToWorkspaceButton(
    view: HTMLViewer,
    translator?: ITranslator
  ): Widget {
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    return ReactWidget.create(
      <Private.SaveButton
        view={view}
        label="Save As Notebook"
        signal={view.model.savingNotebookSignal}
        onClick={view.model.saveNotebookToWorkspace.bind(view.model)}
        tooltip={trans.__(
          'Save the file as Notebook(.ipynb) to your workspace'
        )}
      />
    );
  }

  /**
   * Create the trust button
   *
   * @param view HTML viewer widget
   * @param translator Application translator object
   * @returns Toolbar item button
   */
  export function createSaveHTMLToWorkspaceButton(
    view: HTMLViewer,
    translator?: ITranslator
  ): Widget {
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    return ReactWidget.create(
      <Private.SaveButton
        view={view}
        label="Save As HTML"
        signal={view.model.savingHTMLSignal}
        onClick={view.model.saveToWorkspace.bind(view.model)}
        tooltip={trans.__('Save the file as HTML to your workspace')}
      />
    );
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Namespace for SaveButton.
   */
  export namespace SaveButtonComponent {
    /**
     * Interface for SaveButton props.
     */
    export interface IProps {
      label: string;
      tooltip: string;
      view: HTMLViewer;
      onClick: () => void;
      signal: ISignal<PreviewNotebookModel, boolean>;
    }
  }

  /**
   * React component for a save button.
   *
   * This wraps the SaveButtonComponent and watches for save action.
   */
  export function SaveButton(props: SaveButtonComponent.IProps): JSX.Element {
    return (
      <UseSignal signal={props.signal}>
        {(_, isPending) => {
          return (
            <ToolbarButtonComponent
              label={props.label}
              onClick={props.onClick}
              enabled={Boolean(!isPending)}
              className="preview-toolbar-btn"
              tooltip={isPending ? 'Saving...' : props.tooltip}
              icon={downloadIcon.bindprops({ stylesheet: 'menuItem' })}
            />
          );
        }}
      </UseSignal>
    );
  }
}
