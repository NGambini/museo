import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer, type Socket } from 'socket.io';
import {
  io as connectUpstream,
  type Socket as UpstreamSocket,
} from 'socket.io-client';
import { parseCookie } from 'cookie';
import { isAllowedAdmin, verifyAccessToken } from '../admin/auth.js';
import { env } from '../config/env.js';

/** Must match the event name the API emits. */
export const JOB_EVENT = 'generation:update';

const ACCESS_COOKIE = 'bo_at';

/**
 * Relays generation progress from the API to the browser.
 *
 * Two hops rather than one, on purpose. The browser holds no API token — they
 * live in httpOnly cookies precisely so page scripts cannot read them — so it
 * cannot open the API's websocket itself. It connects here instead, where the
 * cookie is readable, and this process opens the upstream connection on its
 * behalf.
 *
 * One upstream socket per browser tab. That is wasteful in the abstract and
 * irrelevant in practice: this is a backoffice with a handful of admins.
 */
export function attachGenerationRelay(httpServer: HttpServer): SocketServer {
  const server = new SocketServer(httpServer, {
    path: '/bo-ws',
    // Same origin as the page, so the browser sends no Origin-based CORS
    // preflight and there is nothing to open up here.
    serveClient: false,
  });

  server.on('connection', (client: Socket) => {
    const token = readAccessToken(client);
    const claims = token ? verifyAccessToken(token) : null;

    if (!token || !claims || !isAllowedAdmin(claims)) {
      client.disconnect(true);
      return;
    }

    const upstream = connectUpstream(`${env.apiBaseUrl}/generation`, {
      auth: { token },
      transports: ['websocket'],
    });

    console.log(`[ws] ${claims.email} connected, relaying from the API`);
    forward(upstream, client, claims.email);
  });

  return server;
}

function readAccessToken(client: Socket): string | null {
  const header = client.handshake.headers.cookie;
  if (!header) return null;
  return parseCookie(header)[ACCESS_COOKIE] ?? null;
}

function forward(
  upstream: UpstreamSocket,
  client: Socket,
  email: string,
): void {
  upstream.on(JOB_EVENT, (payload: unknown) => client.emit(JOB_EVENT, payload));

  upstream.on('connect', () =>
    client.emit('relay:status', { connected: true }),
  );
  upstream.on('disconnect', () =>
    client.emit('relay:status', { connected: false }),
  );
  upstream.on('connect_error', (error: Error) => {
    console.error(
      `[ws] upstream connection failed for ${email}:`,
      error.message,
    );
    client.emit('relay:status', { connected: false, error: error.message });
  });

  // Without this the upstream socket would outlive the tab that needed it.
  client.on('disconnect', () => upstream.close());
}
