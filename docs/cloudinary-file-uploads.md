# Cloudinary File Uploads

Secure file uploads via Cloudinary using signed URLs.

## Overview

Instead of uploading directly, the API generates signed URLs that clients use to upload directly to Cloudinary.

```
1. Client requests signed URL
2. API returns URL with signature
3. Client uploads directly to Cloudinary
4. Client sends Cloudinary public_id to API
5. API stores reference in database
```

## Endpoints

### Get Signed Upload URL

```bash
POST /api/v1/upload/signed-url
Authorization: Bearer <token>

{
  "resourceType": "image",
  "folder": "profile-pictures"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://api.cloudinary.com/v1_1/...",
    "uploadPreset": "pbr_hut_preset",
    "signature": "abc123...",
    "timestamp": 1676000000
  }
}
```

### Verify Upload

```bash
POST /api/v1/upload/confirm
{
  "public_id": "pbr_hut/profile_pictures/user_123",
  "format": "jpg",
  "secure_url": "https://res.cloudinary.com/..."
}
```

## Implementation

```typescript
@Injectable()
export class CloudinaryService {
  private cloudinary: Cloudinary;

  constructor() {
    this.cloudinary = new Cloudinary({
      cloud: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET
      }
    });
  }

  getSignedUrl(folder: string): SignedUrlDto {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(timestamp);

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
      signature,
      timestamp,
      folder
    };
  }

  private generateSignature(timestamp: number): string {
    const toSign = `timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
    return crypto.createHash('sha1').update(toSign).digest('hex');
  }

  async deleteImage(publicId: string): Promise<void> {
    await this.cloudinary.api.delete_resources([publicId]);
  }
}
```

## Client Upload

```typescript
// Client-side code
async uploadProfilePicture(file: File): Promise<string> {
  // 1. Get signed URL
  const { uploadUrl, uploadPreset, signature, timestamp, folder } 
    = await api.post('/upload/signed-url');

  // 2. Upload to Cloudinary
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('signature', signature);
  formData.append('timestamp', timestamp);
  formData.append('folder', folder);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  });

  const { public_id, secure_url } = await response.json();

  // 3. Confirm upload
  await api.post('/upload/confirm', { public_id, secure_url });

  return secure_url;
}
```

## Image URLs

```
Original: 
https://res.cloudinary.com/cloud/image/upload/v1/pbr_hut/profile/abc123.jpg

Optimized (for web):
https://res.cloudinary.com/cloud/image/upload/w_200,h_200,c_fill,q_auto/v1/pbr_hut/profile/abc123.jpg

Thumbnail:
https://res.cloudinary.com/cloud/image/upload/w_100,h_100,c_thumb/v1/pbr_hut/profile/abc123.jpg

Optimized (for mobile):
https://res.cloudinary.com/cloud/image/upload/w_500,q_auto,f_auto/v1/pbr_hut/profile/abc123.jpg
```

## Transformations

```typescript
// Generate transformation URL
const imageUrl = cloudinary.url('pbr_hut/profile/abc123', {
  width: 200,
  height: 200,
  crop: 'fill',
  quality: 'auto',
  format: 'auto'
});
```

## Security

1. **Signed URLs** - Prevent unauthorized uploads
2. **Upload presets** - Restrict allowed transformations
3. **Folder structure** - Organize by user/type
4. **Virus scanning** - Cloudinary scans all uploads
5. **Delete on cleanup** - Remove old images

## Database Schema

```prisma
model UserProfile {
  id              String @id
  userId          String @unique
  profileImageUrl String?
  cloudinaryId    String?  // For deletion
}
```

## Best Practices

1. **Use transformations** - Resize for different views
2. **Optimize quality** - Use q_auto for browsers
3. **Store public_id** - For future deletions
4. **Cleanup on delete** - Remove old images
5. **Use CDN** - Cloudinary serves from edge
6. **Validate on backend** - Verify upload success
