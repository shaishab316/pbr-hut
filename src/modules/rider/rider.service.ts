import { Injectable } from '@nestjs/common';
import { CloudinaryService } from '@/modules/upload/cloudinary.service';
import { RiderRepository } from './repositories/rider.repository';

@Injectable()
export class RiderService {
  constructor(
    private readonly riderRepository: RiderRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadNid(
    userId: string,
    front: Express.Multer.File,
    back: Express.Multer.File,
  ) {
    const [frontResult, backResult] = await Promise.all([
      this.cloudinaryService.uploadFile({ file: front, folder: 'nid' }),
      this.cloudinaryService.uploadFile({ file: back, folder: 'nid' }),
    ]);

    return this.riderRepository.updateNid(userId, {
      nidFrontUrl: frontResult.url,
      nidBackUrl: backResult.url,
      nidStatus: 'PENDING',
    });
  }
}
