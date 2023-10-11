import { PartialJSONValue } from '@lumino/coreutils';

export interface IJupyterContentsModel {
  name?: string;
  path?: string;
  type?: string;
  created?: string;
  lastModified?: string;
  writable?: boolean;
  mimetype?: string;
  content?: PartialJSONValue;
  format?: 'json' | 'text' | 'base64' | null;
  chunk?: number;
}

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
  version: number;
  title: string;
  permissions?: Array<string>;
  shareable_link: string;
  collaborators?: Array<ICollaborators>;
  content?: IJupyterContentsModel;
  isReadOnly?: boolean;
}

export interface IShareDialogBody {
  value: IPublishedFileMetadata;
  formState: {
    isValid: boolean;
    isDirty: boolean;
    error: string;
  };
}
export interface IPublishedFileIdentifier {
  id?: string;
  path?: string;
  shareable_link?: string;
}

export interface IPreviewFileResponse {
  id: string;
  author: string;
  created: string;
  last_modified: string;
  shareable_link: string;
  version: number;
  title: string;
  html: string;
}

export type Contact = {
  id: string;
  name: string;
  email: string;
};
