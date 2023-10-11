import { LabIcon } from '@jupyterlab/ui-components';
import shareIconSvg from '../../style/icons/share_icon.svg';
import previewIconSvg from '../../style/icons/preview_icon.svg';

export const shareIcon = new LabIcon({
  name: 'publish:shareIcon',
  svgstr: shareIconSvg
});

export const previewIcon = new LabIcon({
  name: 'publish:previewIcon',
  svgstr: previewIconSvg
});
