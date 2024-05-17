import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IEventListener, EventListener } from './token';

const PLUGIN_ID = '@jupyter_sharing/events-listener-plugin';

export const EventsListenerPlugin: JupyterFrontEndPlugin<IEventListener> = {
  id: PLUGIN_ID,
  provides: IEventListener,
  autoStart: true,
  activate: async (app: JupyterFrontEnd) => {
    console.log(`Apple Notebooks extension activated: ${PLUGIN_ID}`);
    await app.serviceManager.ready;
    return new EventListener(app.serviceManager.events);
  }
};
