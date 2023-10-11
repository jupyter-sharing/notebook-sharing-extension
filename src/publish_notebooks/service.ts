import { URLExt } from '@jupyterlab/coreutils';
import { requestAPI } from '../handler';
import {
  Contact,
  IJupyterContentsModel,
  IPreviewFileResponse,
  IPublishedFileMetadata
} from './types';

// const DEFAULT_CONTACTS: Contact[] = [
//   { id: '1', name: 'Alice Graham', email: 'alice@yahoo.com' },
//   { id: '2', name: 'Asher Reichert', email: 'asher@yahoo.com' },
//   { id: '3', name: 'James Anderson', email: 'james@yahoo.com' },
//   { id: '4', name: 'Ervin Howell ', email: 'ervin@yahoo.com' },
//   { id: '5', name: 'Barbara Stein', email: 'barbara@yahoo.com' },
//   { id: '6', name: 'Clementine Bauch ', email: 'chris-s@yahoo.com' },
//   { id: '7', name: 'Matthew Hogard', email: 'mat@gmail.com' },
//   { id: '8', name: 'Patricia Lebsack', email: 'patricia@gmail.com' },
//   { id: '9', name: 'Sathish kumar', email: 'sathish@yahoo.com' },
//   { id: '10', name: '', email: 'lebron@yahoo.com' }
// ];

/*
  Client class that mirrors the REST API in the publishing
  Jupyter Server extension.
*/
export class PublishingExtensionClient {
  /*
    Publishing a new file to sharing/publishing service.
  */
  publishFile(model: IJupyterContentsModel): Promise<IPublishedFileMetadata> {
    console.log('POST publishing');

    return requestAPI('publishing', {
      body: JSON.stringify(model),
      method: 'POST'
    });

    // return new Promise(r => {
    //   setTimeout(
    //     () =>
    //       r({
    //         id: '0Bx3CCcI9gVG5c3RhcnRlcl9maWxl',
    //         author:
    //           '{"id": "49", "name": "Sathish Kumar", "email": "thangaraj@apple.com"}',
    //         created: new Date().toISOString(),
    //         last_modified: new Date().toISOString(),
    //         version: 1,
    //         title: 'bayesianStatistics.ipynb',
    //         permissions: ['read', 'write'],
    //         shareable_link:
    //           'http://localhost:8888/publish/xcvbdsd1/0Bx3CCcI9gVG5c3RhcnRlcl9maWxl/view?usp=sharing',
    //         collaborators: [
    //           {
    //             id: '49',
    //             name: 'Sathish kumar',
    //             email: 'thangaraj@apple.com'
    //           }
    //         ],
    //         content: {
    //           content: '<h2>Published notebook</h2>'
    //         }
    //       }),
    //     2000
    //   );
    // });
  }

  /*
    Preview a file from the publishing service. Returns raw HTML
    to render using the custom HTML renderer below.
  */
  previewFile(fileId: string): Promise<IPreviewFileResponse> {
    const url = URLExt.join('publishing', fileId, 'preview');

    return requestAPI(url);

    // return new Promise(resolve => {
    //   setTimeout(
    //     () =>
    //       resolve({
    //         id: '0Bx3CCcI9gVG5c3RhcnRlcl9maWxl',
    //         author:
    //           '{"id": "49", "name": "Sathish Kumar", "email": "thangaraj@apple.com"}',
    //         created: new Date().toISOString(),
    //         last_modified: new Date().toISOString(),
    //         title: 'bayesianStatistics.ipynb',
    //         shareable_link:
    //           'http://localhost:8888/publish/xcvbdsd1/0Bx3CCcI9gVG5c3RhcnRlcl9maWxl/view?usp=sharing',
    //         html: '<h2>Published notebook</h2>',
    //         version: 1
    //       }),
    //     2000
    //   );
    // });
  }

  /*
    Get the metadata from a published file.
  */
  getFile(fileId: string): Promise<IPublishedFileMetadata> {
    const url = URLExt.join('publishing', fileId);
    return requestAPI(url);
  }

  /*
    Remove a file from the publishing service.
  */
  removeFile(fileId: string): any {
    const url = URLExt.join('publishing', fileId);
    return requestAPI(url, { method: 'DELETE' });
  }

  /*
    Remove a file from the publishing service.
  */
  download(model: { id: string; path: string }): any {
    const { id: fileId } = model;
    const url = URLExt.join('publishing', fileId, 'download');

    return requestAPI(url, { method: 'POST', body: JSON.stringify(model) });

    // console.log(url);

    // return new Promise((_, r) => setTimeout(() => r(''), 3000));
  }

  /*
    Update a file that has been previously published. This can be used
    to add collaborators or update content.
  */
  async updateFile(
    model: IPublishedFileMetadata
  ): Promise<IPublishedFileMetadata> {
    const url = URLExt.join('publishing', model.id);
    return requestAPI(url, { method: 'PATCH', body: JSON.stringify(model) });
  }

  async searchUsers(query: string): Promise<Contact[]> {
    const url = URLExt.join(
      'publishing',
      'search',
      'users',
      '?search_string=' + encodeURIComponent(query)
    );

    return requestAPI(url);

    // TODO: Add error handler for all APIs
    // try {
    //   return new Promise(resolve => {
    //     setTimeout(
    //       () =>
    //         resolve(
    //           DEFAULT_CONTACTS.filter(
    //             ({ email }) =>
    //               email.toLowerCase().indexOf(query.toLowerCase()) > -1
    //           )
    //         ),
    //       500
    //     );
    //   });
    // } catch (e: unknown) {
    //   console.log(e);
    //   return Promise.resolve([]);
    // }
  }
}
