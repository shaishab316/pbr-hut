import {
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RiderService } from './rider.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtGuard } from '@/common/guards';
import { createFileUploadInterceptor } from '../upload/interceptors/file-upload.interceptor';
import type { SafeUser } from '@/common/types/safe-user.type';
import { ApiUploadNid } from './docs/rider.docs';

const NidUploadInterceptor = createFileUploadInterceptor({
  fields: [
    { name: 'nidFront', maxCount: 1 },
    { name: 'nidBack', maxCount: 1 },
  ],
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSize: 5 * 1024 * 1024,
});

@UseGuards(JwtGuard)
@Controller('rider')
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  @ApiUploadNid()
  @Post('nid')
  @UseInterceptors(NidUploadInterceptor)
  uploadNid(
    @CurrentUser() user: SafeUser,
    @UploadedFiles()
    files: {
      nidFront?: Express.Multer.File[];
      nidBack?: Express.Multer.File[];
    },
  ) {
    return this.riderService.uploadNid(
      user.id,
      files.nidFront![0],
      files.nidBack![0],
    );
  }
}
