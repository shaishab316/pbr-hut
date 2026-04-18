import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { createFileUploadInterceptor } from '../upload/interceptors/file-upload.interceptor';
import { ZodValidationException } from 'nestjs-zod';
import { safeJsonParse } from '@/common/utils/safeJsonParse';
import { AdsService } from './ads.service';
import { CreateAdsDto, createAdsSchema } from './dto/create-ads.dto';
import { UpdateAdsDto, updateAdsSchema } from './dto/update-ads.dto';

const AdsMediaUploadInterceptor = createFileUploadInterceptor({
  fields: [
    {
      name: 'media',
      maxCount: 1,
      maxFileSize: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  ],
});

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Post()
  @UseInterceptors(AdsMediaUploadInterceptor)
  async createAds(
    @UploadedFiles() files: { media?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    const raw: CreateAdsDto = body['data'] ? safeJsonParse(body['data']) : body;

    const dto = createAdsSchema.safeParse(raw);

    if (!dto.success) {
      throw new ZodValidationException(dto.error);
    }

    const mediaFile = files?.media?.[0];

    if (!mediaFile) {
      throw new ZodValidationException([
        {
          code: 'custom',
          message: 'Media file is required',
        },
      ]);
    }

    const ads = await this.adsService.createAds(dto.data, mediaFile);

    return {
      message: 'Ads created successfully',
      data: ads,
    };
  }

  @Get()
  async getAds() {
    const ads = await this.adsService.getAds();
    return {
      message: 'Ads retrieved successfully',
      data: ads,
    };
  }

  @Get(':id')
  async getAdsById(@Param('id') adsId: string) {
    const ads = await this.adsService.getAdsById(adsId);
    return {
      message: 'Ads retrieved successfully',
      data: ads,
    };
  }

  @Patch(':id')
  @UseInterceptors(AdsMediaUploadInterceptor)
  async updateAds(
    @Param('id') adsId: string,
    @UploadedFiles() files: { media?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    const raw: UpdateAdsDto = body['data'] ? safeJsonParse(body['data']) : body;

    const dto = updateAdsSchema.safeParse(raw);

    if (!dto.success) {
      throw new ZodValidationException(dto.error);
    }

    const mediaFile = files?.media?.[0];

    const updatedAds = await this.adsService.updateAds(
      adsId,
      dto.data,
      mediaFile,
    );

    return {
      message: 'Ads updated successfully',
      data: updatedAds,
    };
  }

  @Delete(':id')
  async deleteAds(@Param('id') adsId: string) {
    const deletedAds = await this.adsService.deleteAds(adsId);

    return {
      message: 'Ads deleted successfully',
      data: deletedAds,
    };
  }
}
