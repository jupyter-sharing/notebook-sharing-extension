import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { PublishNotebookPlugin } from './publish_notebooks';
import { ViewSharedNotebooksPlugin } from './shared_notebooks';

const plugins: JupyterFrontEndPlugin<any>[] = [
  PublishNotebookPlugin,
  ViewSharedNotebooksPlugin,
];

export default plugins;
