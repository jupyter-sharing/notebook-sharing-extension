import { Spinner } from '@jupyterlab/apputils';
import { closeIcon, LabIcon, trustedIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import failedIconSvg from '../../style/icons/failed_icon.svg';

type AsyncHandlerArgs<T> = {
  title: string;
  tooltip?: string;
  action: Promise<T>;
  successMessage?: string;
  failureMessage?: string | CallableFunction;
};

type LoaderArgs = {
  title: string;
  tooltip?: string;
  onClose: () => void;
};

const failedIcon = new LabIcon({
  name: 'failed',
  svgstr: failedIconSvg
});

class Loader extends Widget {
  constructor({ title, tooltip = '', onClose }: LoaderArgs) {
    super();

    const spinnerIcon = new Spinner();
    const wrapper = document.createElement('div');
    const iconContainer = document.createElement('div');
    const messageContainer = document.createElement('div');
    const closeButton = document.createElement('button');

    messageContainer.className = 'jp-toast-text';
    iconContainer.className = 'jp-toast-icon';
    wrapper.className = 'jp-spinner-container';
    messageContainer.title = tooltip || title;

    wrapper.appendChild(iconContainer);
    wrapper.appendChild(messageContainer);
    wrapper.appendChild(closeButton);

    iconContainer.appendChild(spinnerIcon.node);
    closeButton.appendChild(closeIcon.element({ className: 'close-icon' }));
    messageContainer.appendChild(document.createTextNode(title));

    this.icon = iconContainer;
    this.message = messageContainer;
    this.node.appendChild(wrapper);

    this.closeBtn = closeButton;
    this.closeBtn.style.display = 'none';
    closeButton.addEventListener('click', () => onClose());
  }

  setSuccessMessage(message: string) {
    this.icon.innerHTML = '';
    this.icon.appendChild(
      trustedIcon
        .bindprops({
          width: '24px',
          fill: 'var(--jp-accent-color2)',
          stroke: 'var(--jp-accent-color2)'
        })
        .element()
    );
    this.message.textContent = message;
    this.closeBtn.style.display = 'block';

    return true;
  }

  setFailureMessage(message: string) {
    this.icon.innerHTML = '';
    this.icon.appendChild(
      failedIcon
        .bindprops({
          width: '20px',
          stroke: 'transparent',
          fill: 'var(--jp-error-color2)'
        })
        .element()
    );
    this.message.textContent = message;
    this.closeBtn.style.display = 'block';

    return true;
  }

  private icon: HTMLDivElement;
  private message: HTMLDivElement;
  private closeBtn: HTMLButtonElement;
}

export class AsyncActionHandler<T> extends Widget {
  constructor(private options: AsyncHandlerArgs<T>) {
    super();

    const widget = new Widget();

    this.loader = new Loader({
      title: options.title,
      tooltip: options.tooltip,
      onClose: this.close.bind(this)
    });

    this.addClass('jp-async-toast');
    widget.addClass('jp-toast-content');

    this.node.appendChild(widget.node);
    widget.node.appendChild(this.loader.node);
  }

  start(): Promise<T> {
    const { action, successMessage, failureMessage } = this.options;
    const onSuccess = () =>
      successMessage && this.loader.setSuccessMessage(successMessage);

    let onFailure;
    if (typeof failureMessage == 'string') {
      onFailure = () =>
        failureMessage && this.loader.setFailureMessage(failureMessage);
    } else {
      onFailure = () => {
        if (failureMessage) {
          return this.loader.setFailureMessage(failureMessage());
        }
      };
    }

    action
      .then(onSuccess)
      .catch(onFailure)
      .then(shouldWait =>
        shouldWait ? setTimeout(this.close.bind(this), 1500) : this.close()
      );

    Widget.attach(this, document.body);

    return action;
  }

  private loader: Loader;
}
