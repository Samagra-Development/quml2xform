export type FormUploadStatus = {
  status: 'PENDING' | 'UPLOADED' | 'ERROR';
  error?: string;
  errorCode?: string;
  errorMessage?: string;
  data?: any;
};

export enum OdkBackendType {
  CENTRAL = 'CENTRAL',
  AGGREGATE = 'AGGREGATE',
}

export const FormUploadServiceToken = 'FormUploadServiceToken';
