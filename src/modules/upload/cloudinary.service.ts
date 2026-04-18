import { Readable } from 'node:stream';
import { BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
  attachmentType: string;
}

export interface UploadOptions {
  file: Express.Multer.File;
  folder?: string;
  resourceType?: 'auto' | 'image' | 'video' | 'raw';
}

@Injectable()
export class CloudinaryService {
  async uploadFile({
    file,
    folder = 'uploads',
    resourceType = 'auto',
  }: UploadOptions): Promise<UploadResult> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType },
        (error, result) => {
          if (error || !result) {
            return reject(
              new BadRequestException(error?.message ?? 'Upload failed'),
            );
          }

          resolve(result);
        },
      );

      Readable.from(file.buffer)
        .on('error', (error) => {
          reject(new BadRequestException(`Stream error: ${error.message}`));
        })
        .pipe(uploadStream);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      attachmentType: result.resource_type,
    };
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  extractPublicIdFromUrl(url: string): string {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return match ? match[1] : '';
  }
}
