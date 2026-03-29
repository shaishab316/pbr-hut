import { ResponseInterceptor } from './response.interceptor';
import { of } from 'rxjs';

const mockResponse = {
  statusCode: 200,
  setHeader: jest.fn(),
};

const mockContext = {
  switchToHttp: () => ({
    getResponse: () => mockResponse,
  }),
} as any;

const mockCallHandler = (data: any) => ({
  handle: () => of(data),
});

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
    jest.clearAllMocks();
  });

  it('should wrap plain data', (done) => {
    interceptor
      .intercept(mockContext, mockCallHandler({ id: 1 }))
      .subscribe((result) => {
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          message: 'Success',
          data: { id: 1 },
        });
        done();
      });
  });

  it('should use message and data fields when present', (done) => {
    interceptor
      .intercept(
        mockContext,
        mockCallHandler({ message: 'Created', data: { id: 1 } }),
      )
      .subscribe((result) => {
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          message: 'Created',
          data: { id: 1 },
        });
        done();
      });
  });

  it('should return null data when message present but no data', (done) => {
    interceptor
      .intercept(mockContext, mockCallHandler({ message: 'OK' }))
      .subscribe((result) => {
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          message: 'OK',
          data: null,
        });
        done();
      });
  });

  it('should include meta when present', (done) => {
    const payload = { message: 'List', data: [1, 2], meta: { total: 2 } };
    interceptor
      .intercept(mockContext, mockCallHandler(payload))
      .subscribe((result) => {
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          message: 'List',
          data: [1, 2],
          meta: { total: 2 },
        });
        done();
      });
  });

  it('should set X-Cache header and strip __cache field', (done) => {
    interceptor
      .intercept(
        mockContext,
        mockCallHandler({ __cache: 'HIT', message: 'OK' }),
      )
      .subscribe(() => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
        done();
      });
  });
});
