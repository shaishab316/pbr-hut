import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service';
import { Env } from '@/config/app.config';

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'NODE_ENV') return 'development';
    if (key === 'TEST_OTP') return '000000';
    if (key === 'OTP_SECRET') return 'test-secret';
  }) as jest.Mock,
};

describe('OtpService', () => {
  let service: OtpService;

  beforeEach(() => {
    service = new OtpService(mockConfig as unknown as ConfigService<Env, true>);
    jest.clearAllMocks();
  });

  it('should generate a 6-digit OTP', () => {
    const otp = service.generate('john@example.com');
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('should verify a valid OTP', () => {
    const otp = service.generate('john@example.com');
    expect(service.verify(otp, 'john@example.com')).toBe(true);
  });

  it('should reject an invalid OTP', () => {
    service.generate('john@example.com');
    expect(service.verify('000001', 'john@example.com')).toBe(false);
  });

  it('should return true for TEST_OTP in development', () => {
    expect(service.verify('000000', 'john@example.com')).toBe(true);
  });

  it('should reject TEST_OTP in production', () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'TEST_OTP') return '000000';
    });

    const prodService = new OtpService(
      mockConfig as unknown as ConfigService<Env, true>,
    );

    expect(prodService.verify('000000', 'john@example.com')).toBe(false);
  });
});
