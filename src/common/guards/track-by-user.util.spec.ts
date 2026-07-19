import { trackByUserOrIp } from './track-by-user.util';

describe('trackByUserOrIp', () => {
  it('returns the user id when the request is authenticated', () => {
    expect(trackByUserOrIp({ user: { id: 'user-1' }, ip: '1.2.3.4' })).toBe(
      'user-1',
    );
  });

  it('falls back to the IP when there is no user on the request', () => {
    expect(trackByUserOrIp({ ip: '1.2.3.4' })).toBe('1.2.3.4');
  });
});
