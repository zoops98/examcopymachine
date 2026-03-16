
export type ProcessingStatus = 'idle' | 'waiting' | 'processing' | 'completed' | 'error';

export interface FileData {
  id: string;
  file: File;
  previewUrl: string;
  status: ProcessingStatus;
  progress: number;
  extractedText?: string;
  error?: string;
  type: 'image' | 'pdf';
}

export interface OCRConfig {
  highAccuracy: boolean;
  maintainLayout: boolean;
}
