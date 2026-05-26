export const filesPrefix = "user-files/";
export const thumbnailsPrefix = "user-file-thumbnails/";

// e.g. "user-files/123/"
export const userFilesPrefix = (userId: string) => `${filesPrefix}${userId}/`;

// e.g. "user-file-thumbnails/123/"
export const userFileThumbnailsPrefix = (userId: string) =>
  `${thumbnailsPrefix}${userId}/`;

// e.g. "user-files/123/abc"
export const userFileR2Key = (userId: string, id: string) =>
  `${userFilesPrefix(userId)}${id}`;

// e.g. "user-file-thumbnails/123/abc"
export const userFileThumbnailR2Key = (userId: string, id: string) =>
  `${userFileThumbnailsPrefix(userId)}${id}`;
