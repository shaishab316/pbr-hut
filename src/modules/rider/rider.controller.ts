import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RiderService } from './rider.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { JwtGuard, RolesGuard } from '@/common/guards';
import { createFileUploadInterceptor } from '../upload/interceptors/file-upload.interceptor';
import type { SafeUser } from '@/common/types/safe-user.type';
import { UpdateRiderLocationDto } from './dto/update-rider-location.dto';
import { ApiUpdateRiderLocation, ApiUploadNid } from './docs/rider.docs';
import {
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '@/common/decorators/cache.decorator';

const NidUploadInterceptor = createFileUploadInterceptor({
  fields: [
    { name: 'nidFront', maxCount: 1 },
    { name: 'nidBack', maxCount: 1 },
  ],
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSize: 5 * 1024 * 1024,
});

@ApiTags('Rider')
@UseGuards(JwtGuard)
@Controller('rider')
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  @Get('home/overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @CacheKey('rider:home:overview::user.id')
  @CacheTTL(60)
  getHomeOverview(@CurrentUser('id') userId: string) {
    return this.riderService.getHomeOverview(userId);
  }

  @ApiUpdateRiderLocation()
  @UseGuards(RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('location')
  @HttpCode(HttpStatus.OK)
  @InvalidateCache(
    'rider:home:overview::user.id',
    'rider:earning:overview::user.id',
  )
  updateLocation(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRiderLocationDto,
  ) {
    return this.riderService.updateLocation(userId, dto);
  }

  @Get('earning/overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @CacheKey('rider:earning:overview::user.id')
  @CacheTTL(60)
  getEarningOverview(@CurrentUser('id') userId: string) {
    return this.riderService.getEarningOverview(userId);
  }

  @ApiUploadNid()
  @Post('nid')
  @UseInterceptors(NidUploadInterceptor)
  @InvalidateCache('rider:*')
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
