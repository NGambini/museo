interface RequestWithOptionalUser {
  user?: { id?: string };
  ip?: string;
}

// Throttler tracker: buckets requests by authenticated user id, falling back
// to IP when the route isn't behind auth (or ran before the auth guard).
export function trackByUserOrIp(req: RequestWithOptionalUser): string {
  const userId = req.user?.id;
  return userId ?? String(req.ip);
}
