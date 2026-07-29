type PrepareImageOptions = {
  maxSize?: number;
  mimeType?: "image/webp" | "image/png" | "image/jpeg";
  quality?: number;
};

type PreparedImageResult = {
  dataUrl: string;
  width: number;
  height: number;
};

const defaultOptions: Required<PrepareImageOptions> = {
  maxSize: 128,
  mimeType: "image/webp",
  quality: 0.9,
};

function loadImageFromObjectUrl(objectUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load selected image"));
    img.src = objectUrl;
  });
}

export async function prepareImageDataUrl(
  file: File,
  options: PrepareImageOptions = {},
): Promise<PreparedImageResult> {
  const { maxSize, mimeType, quality } = { ...defaultOptions, ...options };

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImageFromObjectUrl(objectUrl);
    const shortestSide = Math.min(img.width, img.height);
    const outputSize = Math.min(maxSize, shortestSide);

    const sx = Math.floor((img.width - shortestSide) / 2);
    const sy = Math.floor((img.height - shortestSide) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to process image");
    }

    context.drawImage(
      img,
      sx,
      sy,
      shortestSide,
      shortestSide,
      0,
      0,
      outputSize,
      outputSize,
    );

    const dataUrl = canvas.toDataURL(mimeType, quality);

    return { dataUrl, width: outputSize, height: outputSize };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
