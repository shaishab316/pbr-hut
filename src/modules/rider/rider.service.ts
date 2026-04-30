import { Injectable, Logger } from '@nestjs/common';
import { H3IndexUtil } from '@/common/utils/h3index.util';
import { CloudinaryService } from '@/infra/upload/cloudinary.service';
import { RiderRepository } from './repositories/rider.repository';
import type { UpdateRiderLocationInput } from './dto/update-rider-location.dto';

@Injectable()
export class RiderService {
  private readonly logger = new Logger(RiderService.name);

  constructor(
    private readonly riderRepository: RiderRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async updateLocation(userId: string, dto: UpdateRiderLocationInput) {
    this.logger.log(
      `📡 Updating rider location: ${userId} - Lat: ${dto.latitude}, Lng: ${dto.longitude}`,
    );

    const h3Index = H3IndexUtil.encodeH3(dto.latitude, dto.longitude);
    this.logger.debug(`📍 H3 Index: ${h3Index}`);

    const data = await this.riderRepository.upsertLocation(userId, {
      latitude: dto.latitude,
      longitude: dto.longitude,
      h3Index,
    });

    this.logger.log(`✅ Rider location updated: ${userId}`);

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
    this.logger.log(`📄 Uploading NID documents for rider: ${userId}`);

    try {
      const [frontResult, backResult] = await Promise.all([
        this.cloudinaryService.uploadFile({ file: front, folder: 'nid' }),
        this.cloudinaryService.uploadFile({ file: back, folder: 'nid' }),
      ]);

      this.logger.debug(`📄 NID Front uploaded: ${frontResult.url}`);
      this.logger.debug(`📄 NID Back uploaded: ${backResult.url}`);

      const result = await this.riderRepository.updateNid(userId, {
        nidFrontUrl: frontResult.url,
        nidBackUrl: backResult.url,
        nidStatus: 'PENDING',
      });

      this.logger.log(`✅ NID documents uploaded for rider: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ NID upload failed for rider ${userId}:`, error);
      throw error;
    }
  }

  async getHomeOverview(userId: string) {
    return this.riderRepository.getHomeOverview(userId);
  }

  async getEarningOverview(userId: string) {
    return this.riderRepository.getEarningOverview(userId);
  }
}
