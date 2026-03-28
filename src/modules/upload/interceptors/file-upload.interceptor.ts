import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

export interface FileUploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  fieldName: string;
}

const DEFAULT_CONFIG: FileUploadConfig = {
  maxFileSize: 5 * 1024 * 1024,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
  ],
  fieldName: 'file',
};

export const createChatFileInterceptor = (
  overrides: Partial<FileUploadConfig> = {},
) => {
  const config = { ...DEFAULT_CONFIG, ...overrides };

  const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      return cb(new BadRequestException('File type not allowed'), false);
    }
    cb(null, true);
  };

  return FileInterceptor(config.fieldName, {
    storage: memoryStorage(),
    limits: { fileSize: config.maxFileSize },
    fileFilter,
  });
};
