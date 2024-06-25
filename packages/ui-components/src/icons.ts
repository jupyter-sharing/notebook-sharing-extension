import { LabIcon } from '@jupyterlab/ui-components';
import eventNoteSvgstr from '../style/icons/event-note.svg';
import failedIconSvg from '../style/icons/failed_icon.svg';
import previewIconSvg from '../style/icons/preview_icon.svg';

export const eventNoteIcon = new LabIcon({
  name: 'jupyterlab-scheduler:event-note',
  svgstr: eventNoteSvgstr
});

export const failedIcon = new LabIcon({
  name: 'failed',
  svgstr: failedIconSvg
});

export const previewIcon = new LabIcon({
  name: 'publish:previewIcon',
  svgstr: previewIconSvg
});
