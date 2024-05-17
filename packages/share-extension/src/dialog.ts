import { Panel, PanelLayout, Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';
import { Dialog } from '@jupyterlab/apputils';
import { IShareDialogBody } from './types';

type FunctionType = (...args: any[]) => any;

type DialogOptions = Dialog.IOptions<IShareDialogBody>;

type PublishDialogOptions = Partial<DialogOptions> & {
  actionHandlers: Record<
    DialogOptions['buttons'][number]['label'],
    FunctionType
  >;
};

const isFunction = (func: unknown): func is FunctionType =>
  typeof func === 'function';

export class PublishDialog extends Dialog<IShareDialogBody> {
  constructor(options: PublishDialogOptions) {
    super(options);

    this._options = options;

    this.addClass('jp-publish-notebook');

    const error = new Widget();
    const dialogContent = this.layout as PanelLayout;
    const panel = dialogContent.widgets[0] as Panel;

    panel.addWidget(error);
    error.addClass('jp-dialog-validation-error');

    this._messageNode = document.createElement('div');
    this._popupNode = this.createErrorDialog();

    this._errorWidget = error;
    this._messageNode.classList.add('message');
    error.node.appendChild(this._messageNode);
    error.node.appendChild(this._popupNode);

    this._messageNode.addEventListener('animationend', () => {
      this._messageNode.classList.remove('has-error');
      this._messageNode.classList.remove('has-info');
    });
  }

  private createErrorDialog(): HTMLDivElement {
    const container = document.createElement('div');
    const header = document.createElement('span');
    const discardBtn = document.createElement('button');
    const cancelBtn = document.createElement('button');
    const actions = document.createElement('div');
    const buttonClasses = ['jp-Dialog-button', 'jp-mod-styled'];

    cancelBtn.textContent = 'Cancel';
    discardBtn.textContent = 'Discard';
    header.textContent = 'Discard unsaved changes?';

    container.classList.add('error-dialog');
    header.classList.add('dialog-header');
    actions.classList.add('dialog-actions');

    cancelBtn.classList.add(...buttonClasses, 'jp-mod-reject');
    discardBtn.classList.add(...buttonClasses, 'jp-mod-accept');

    container.appendChild(header);
    container.appendChild(actions);
    actions.appendChild(cancelBtn);
    actions.appendChild(discardBtn);

    discardBtn.addEventListener('click', () => super.reject());
    cancelBtn.addEventListener('click', e => {
      this._errorWidget.removeClass('jp-Dialog');
    });

    return container;
  }

  protected onAfterAttach(msg: Message): void {
    const node = this.node;

    node.addEventListener('click', this, true);
    document.addEventListener('mousedown', this, true);
  }

  protected onAfterDetach(msg: Message): void {
    const node = this.node;

    node.removeEventListener('click', this, true);
    document.removeEventListener('mousedown', this, true);
  }

  public reject(): void {
    if (this.isDirty) {
      this._errorWidget.addClass('jp-Dialog');
      this._popupNode.classList.add('has-unsaved-changes');

      return;
    }

    super.reject();
  }

  protected _evtClick(event: MouseEvent): void {
    const buttons = this.node.getElementsByClassName('jp-Dialog-button');
    const content = this.node.getElementsByClassName('jp-Dialog-content')[0];
    const _buttonNodes = Array.from(buttons);
    const clickedButton = _buttonNodes.find(button =>
      button.contains(event.target as HTMLElement)
    );
    const isClickOutside = !content.contains(event.target as HTMLElement);
    const popupContaintsNode = this._popupNode.contains(
      event.target as HTMLElement
    );

    if (popupContaintsNode || isClickOutside) {
      return;
    }

    if (!clickedButton) {
      return super._evtClick(event);
    }

    const index = _buttonNodes.indexOf(clickedButton);
    const buttonOptions = this._options.buttons?.[index];
    const handler = this._options.actionHandlers[buttonOptions?.label || ''];

    if (this.formData && isFunction(handler)) {
      this._messageNode.classList.add('has-info');
      this._messageNode.innerHTML = 'Link copied';

      return handler(buttonOptions, this.formData.value);
    }

    if (!this.isValid && this.error) {
      this._messageNode.classList.add('has-error');
      this._messageNode.innerHTML = this.error;

      return;
    }

    super.resolve(index);
  }

  public get formData(): IShareDialogBody | null {
    const body = this._options.body as Dialog.IBodyWidget<IShareDialogBody>;

    if (!(body instanceof Widget) || !isFunction(body.getValue)) {
      return null;
    }

    return body.getValue();
  }

  public get error(): string | undefined {
    const { formState } = this.formData || {};

    return formState?.error;
  }

  public get isValid(): boolean {
    const { formState } = this.formData || {};

    return Boolean(formState?.isValid);
  }

  public get isDirty(): boolean {
    const { formState } = this.formData || {};

    return Boolean(formState?.isDirty);
  }

  private _errorWidget: Widget;
  private _popupNode: HTMLDivElement;
  private _messageNode: HTMLDivElement;
  private _options: PublishDialogOptions;
}
