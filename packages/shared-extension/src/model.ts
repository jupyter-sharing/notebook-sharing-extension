import { ISignal, Signal } from '@lumino/signaling';
import { Poll } from '@lumino/polling';
import { IDisposable } from '@lumino/disposable';
import { URLExt } from '@jupyterlab/coreutils';
import { requestAPI } from '@jupyter_sharing/core';

export interface ICollaborators {
  id: string;
  name: string;
  email: string;
  permissions?: Array<string> | null;
}

export interface IPublishedFileMetadata {
  id: string;
  author: string;
  created: string;
  last_modified: string;
  version: string;
  title: string;
  permissions?: Array<string>;
  shareable_link: string;
  collaborators: ICollaborators[] | null;
  contents: null;
  isReadOnly?: boolean;
  liveEnabled?: boolean;
  author_server_url?: string;
}

/**
 * The default duration of the auto-refresh in ms
 */
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000;

export type ResponseModel = {
  sharedWithMe: any[];
  sharedByMe: any[];
};

export class SharedNotebooksModel implements IDisposable {
  constructor() {
    this._poll = new Poll({
      auto: false,
      name: 'jupyter_sharing:nb_sharing:plugin:Model',
      factory: () => this.fetchSharedNotebooks(),
      frequency: {
        interval: DEFAULT_REFRESH_INTERVAL,
        backoff: true,
        max: 300 * 1000
      },
      standby: 'when-hidden'
    });
  }

  /**
   * Get whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  get stateChanged(): ISignal<SharedNotebooksModel, ResponseModel> {
    return this._stateChanged;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this._isDisposed = true;
    this._poll.dispose();

    Signal.clearData(this);
  }

  async refresh(): Promise<void> {
    await this._poll.refresh();
    await this._poll.tick;
  }

  async getFile(fileId: string): Promise<IPublishedFileMetadata> {
    const url = URLExt.join('publishing', fileId);

    return requestAPI(url);

    // console.log(url);

    // return new Promise(r =>
    //   setTimeout(
    //     () =>
    //       r({
    //         id: '8af3c4d3-5c2e-4813-92f0-06d02380ae92',
    //         author:
    //           '{"id": "2320337610", "name": "Shravan Achar", "email": "shravan.achar@apple.com"}',
    //         created: '1661366434955',
    //         title: 'Untitled.ipynb',
    //         last_modified: '1661471195080519380',
    //         version: '8',
    //         shareable_link:
    //           'https://publishing-service-dev.us-east-1a.app.apple.com/sharing/8af3c4d3-5c2e-4813-92f0-06d02380ae92/preview',
    //         collaborators: [
    //           {
    //             id: '2320337610',
    //             name: 'Shravan Achar',
    //             email: 'shravan.achar@apple.com'
    //           },
    //           {
    //             id: '2320337611',
    //             name: 'Sathish kumar',
    //             email: 's-thangaraj@apple.com'
    //           }
    //         ],
    //         contents: null
    //       }),
    //     2000
    //   )
    // );
  }

  async deleteFile(fileId: string): Promise<IPublishedFileMetadata> {
    const url = URLExt.join('publishing', fileId);
    return requestAPI(url, { method: 'DELETE' });
  }

  async fetchSharedNotebooks(): Promise<void> {
    // TODO: Make api call to fetch shared notebooks metadata
    console.log('Fetching shared notebooks');

    const sharedByMe: Array<IPublishedFileMetadata> = await requestAPI(
      'publishing?author=me'
    );
    const sharedWithMe: Array<IPublishedFileMetadata> = await requestAPI(
      'publishing?author=others'
    );

    // const sharedByMe = [
    //   {
    //     id: '608231d6-8a60-4660-a00c-948e42f360b6',
    //     author:
    //       '{"id": "2700961736", "name": "Sathish kumar Thangaraj", "email": "sathish_thangaraj@apple.com"}',
    //     created: '1661378666569',
    //     title: 'commonVisualizations.ipynb',
    //     last_modified: '1661878089813421201',
    //     version: '8',
    //     shareable_link:
    //       'https://publishing-service-dev.us-east-1a.app.apple.com/sharing/608231d6-8a60-4660-a00c-948e42f360b6/preview',
    //     collaborators: null,
    //     contents: null
    //   },
    //   {
    //     id: '0eaa96c6-7a9d-45f0-a59f-ee57fbde3395',
    //     author:
    //       '{"id": "2700961736", "name": "Sathish kumar Thangaraj", "email": "sathish_thangaraj@apple.com"}',
    //     created: '1661380048202',
    //     title: 'descriptiveStatistics.ipynb',
    //     last_modified: '1661380045732115482',
    //     version: '1',
    //     shareable_link:
    //       'https://publishing-service-dev.us-east-1a.app.apple.com/sharing/0eaa96c6-7a9d-45f0-a59f-ee57fbde3395/preview',
    //     collaborators: null,
    //     contents: null
    //   },
    //   {
    //     id: '4e643e58-7eee-4306-8d9f-677bc049d842',
    //     author:
    //       '{"id": "2700961736", "name": "Sathish kumar Thangaraj", "email": "sathish_thangaraj@apple.com"}',
    //     created: '1661378654514',
    //     title: 'ARIMA.ipynb',
    //     last_modified: '1661380032062246709',
    //     version: '4',
    //     shareable_link:
    //       'https://publishing-service-dev.us-east-1a.app.apple.com/sharing/4e643e58-7eee-4306-8d9f-677bc049d842/preview',
    //     collaborators: null,
    //     contents: null
    //   },
    //   {
    //     id: 'b657a5d9-d312-4b51-b6bb-763b21448750',
    //     author:
    //       '{"id": "2700961736", "name": "Sathish kumar Thangaraj", "email": "sathish_thangaraj@apple.com"}',
    //     created: '1661469431873',
    //     title: 'bayesianStatistics.ipynb',
    //     last_modified: '1661895631671767369',
    //     version: '9',
    //     shareable_link:
    //       'https://publishing-service-dev.us-east-1a.app.apple.com/sharing/b657a5d9-d312-4b51-b6bb-763b21448750/preview',
    //     collaborators: null,
    //     contents: null
    //   }
    // ];

    // const sharedWithMe = [
    //   {
    //     id: '8af3c4d3-5c2e-4813-92f0-06d02380ae92',
    //     author:
    //       '{"id": "2320337610", "name": "Shravan Achar", "email": "shravan.achar@apple.com"}',
    //     created: '1661366434955',
    //     title: 'Untitled.ipynb',
    //     last_modified: '1661471195080519380',
    //     version: '8',
    //     shareable_link:
    //       'https://publishing-service-dev.us-east-1a.app.apple.com/sharing/8af3c4d3-5c2e-4813-92f0-06d02380ae92/preview',
    //     collaborators: null,
    //     contents: null
    //   }
    // ];

    this._stateChanged.emit({
      sharedByMe,
      sharedWithMe
    });
  }

  private _poll: Poll;
  private _isDisposed = false;
  private _stateChanged = new Signal<SharedNotebooksModel, ResponseModel>(this);
}
