export type ExtensionSettings = {
  siyuanBaseUrl: string;
  siyuanToken: string;
  notebookId: string;
  parentPath: string;
};

export type SaveQuestionRequest = {
  type: 'SAVE_QUESTION';
  question: FenbiQuestion;
};

export type TestConnectionRequest = {
  type: 'TEST_CONNECTION';
  settings?: ExtensionSettings;
};

export type BackgroundRequest = SaveQuestionRequest | TestConnectionRequest;

export type BackgroundResponse =
  | { ok: true; status: 'saved'; blockId?: string }
  | { ok: true; status: 'duplicate' }
  | { ok: true; status: 'connected' }
  | { ok: false; errorCode: string; message: string };

export type FenbiQuestion = {
  source: 'fenbi';
  url: string;
  urlKey: string;
  contentHash: string;
  title: string;
  subject?: string;
  module?: string;
  questionText: string;
  options: Array<{ label: string; text: string }>;
  userAnswer?: string;
  correctAnswer?: string;
  analysis?: string;
  imageUrls: string[];
  keypoints: string[];
  capturedAt: string;
};
