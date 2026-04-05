import { Injectable } from '@nestjs/common';
import { H3IndexUtil } from '@/common/utils/h3index.util';
import { CloudinaryService } from '@/modules/upload/cloudinary.service';
import { RiderRepository } from './repositories/rider.repository';
import type { UpdateRiderLocationInput } from './dto/update-rider-location.dto';

@Injectable()
export class RiderService {
  constructor(
    private readonly riderRepository: RiderRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async updateLocation(userId: string, dto: UpdateRiderLocationInput) {
    const h3Index = H3IndexUtil.encodeH3(dto.latitude, dto.longitude);
    const data = await this.riderRepository.upsertLocation(userId, {
      latitude: dto.latitude,
      longitude: dto.longitude,
      h3Index,
    });

    return {
      message: 'Location updated',
      data,
    };
  }

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
