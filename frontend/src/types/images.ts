export type ImageAsset = {
  id: string;
  url: string;
  isBase64: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateImagePayload = {
  url: string;
};
