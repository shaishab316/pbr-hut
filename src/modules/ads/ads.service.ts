import { Injectable, NotFoundException } from '@nestjs/common';
import { AdsRepository } from './repositories/ads.repository';
import { CreateAdsDto } from './dto/create-ads.dto';
import { CloudinaryService } from '../upload/cloudinary.service';
import { UpdateAdsDto } from './dto/update-ads.dto';

@Injectable()
export class AdsService {
  constructor(
    private readonly adsRepository: AdsRepository,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async createAds(dto: CreateAdsDto, file: Express.Multer.File) {
    const data: Parameters<typeof this.adsRepository.create>[0] = {
      ...dto,
      mediaUrl: '', //? temporary, will be updated after uploading the file
    };

    const uploaded = await this.cloudinary.uploadFile({
      file,
      folder: 'ads',
      resourceType: 'image',
    });

    data.mediaUrl = uploaded.url;

    const newAds = await this.adsRepository.create(data);

    return newAds;
  }

  async updateAds(
    adsId: string,
    dto: UpdateAdsDto,
    file?: Express.Multer.File,
  ) {
    const ads = await this.adsRepository.findById(adsId);
    if (!ads) {
      throw new NotFoundException('Ads not found');
    }

    const data: Parameters<typeof this.adsRepository.update>[1] = {
      ...dto,
    };

    if (file) {
      //? delete old media from cloudinary
      if (ads.mediaUrl) {
        const publicId = this.cloudinary.extractPublicIdFromUrl(ads.mediaUrl);
        await this.cloudinary.deleteFile(publicId);
      }

      const uploaded = await this.cloudinary.uploadFile({
        file,
        folder: 'ads',
        resourceType: 'image',
      });

      data.mediaUrl = uploaded.url;
    }

    const updatedAds = await this.adsRepository.update(adsId, data);

    return updatedAds;
  }

  getAds() {
    return this.adsRepository.findMany();
  }

  async getAdsById(adsId: string) {
    const ads = await this.adsRepository.findById(adsId);
    if (!ads) {
      throw new NotFoundException('Ads not found');
    }
    return ads;
  }

  async deleteAds(adsId: string) {
    const ads = await this.adsRepository.findById(adsId);
    if (!ads) {
      throw new NotFoundException('Ads not found');
    }

    //? delete media from cloudinary
    if (ads.mediaUrl) {
      const publicId = this.cloudinary.extractPublicIdFromUrl(ads.mediaUrl);
      await this.cloudinary.deleteFile(publicId);
    }

    return this.adsRepository.delete(adsId);
  }
}
