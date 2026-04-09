import { ForbiddenException } from '@nestjs/common';
import { ApiaryPermissionGuard } from './apiary-permission.guard';

describe('ApiaryPermissionGuard', () => {
  let guard: ApiaryPermissionGuard;

  beforeEach(() => {
    guard = new ApiaryPermissionGuard();
  });

  function createMockContext(method: string, apiaryRole?: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, apiaryRole }),
      }),
    } as unknown as Parameters<typeof guard.canActivate>[0];
  }

  it('should allow GET requests for VIEWER role', () => {
    expect(guard.canActivate(createMockContext('GET', 'VIEWER'))).toBe(true);
  });

  it('should allow GET requests for EDITOR role', () => {
    expect(guard.canActivate(createMockContext('GET', 'EDITOR'))).toBe(true);
  });

  it('should allow GET requests for OWNER role', () => {
    expect(guard.canActivate(createMockContext('GET', 'OWNER'))).toBe(true);
  });

  it('should allow POST requests for OWNER role', () => {
    expect(guard.canActivate(createMockContext('POST', 'OWNER'))).toBe(true);
  });

  it('should allow PATCH requests for EDITOR role', () => {
    expect(guard.canActivate(createMockContext('PATCH', 'EDITOR'))).toBe(true);
  });

  it('should allow DELETE requests for OWNER role', () => {
    expect(guard.canActivate(createMockContext('DELETE', 'OWNER'))).toBe(true);
  });

  it('should throw ForbiddenException for POST with VIEWER role', () => {
    expect(() =>
      guard.canActivate(createMockContext('POST', 'VIEWER')),
    ).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException for PATCH with VIEWER role', () => {
    expect(() =>
      guard.canActivate(createMockContext('PATCH', 'VIEWER')),
    ).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException for DELETE with VIEWER role', () => {
    expect(() =>
      guard.canActivate(createMockContext('DELETE', 'VIEWER')),
    ).toThrow(ForbiddenException);
  });
});
