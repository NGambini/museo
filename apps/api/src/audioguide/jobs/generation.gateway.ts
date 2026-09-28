import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GenerationJobsService } from './generation-jobs.service';
import { JOB_EVENT, GenerationJob } from './generation-job.types';
import { UserRole } from '../../users/user-role.enum';

interface HandshakeClaims {
  sub: string;
  email: string;
  role: UserRole;
}

/**
 * Pushes generation progress to whoever is watching.
 *
 * Only the backoffice connects here, and it connects server-to-server: the
 * browser never holds an API token, so it talks to the backoffice, which relays.
 * That is why the handshake expects a plain access token rather than a cookie.
 */
@WebSocketGateway({
  namespace: '/generation',
  // The backoffice runs on its own origin, and this is a server-to-server
  // connection carrying a bearer token — no cookie, so nothing to protect
  // against CSRF here.
  cors: { origin: true },
})
export class GenerationGateway
  implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy
{
  private readonly logger = new Logger(GenerationGateway.name);
  private unsubscribe?: () => void;

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jobs: GenerationJobsService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(): void {
    this.unsubscribe = this.jobs.subscribe((job: GenerationJob) => {
      // Every listener gets every job. Callers are admins of the same service,
      // and a generation is not private to the admin who launched it — the
      // catalogue is shared.
      this.server.emit(JOB_EVENT, job);
    });
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
  }

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);
    const claims = token ? this.verify(token) : null;

    if (!claims || claims.role !== UserRole.ADMIN) {
      this.logger.warn(
        `Rejected websocket connection from ${client.handshake.address}`,
      );
      // `disconnect(true)` closes the underlying connection rather than just
      // the socket.io session, so a rejected client cannot keep polling.
      client.disconnect(true);
      return;
    }

    this.logger.log(`Websocket connected: ${claims.email}`);
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = (client.handshake.auth as { token?: string } | undefined)
      ?.token;
    if (fromAuth) return fromAuth;

    const header = client.handshake.headers.authorization;
    return header?.startsWith('Bearer ') ? header.slice(7) : null;
  }

  private verify(token: string): HandshakeClaims | null {
    try {
      return this.jwtService.verify<HandshakeClaims>(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'access_secret',
        algorithms: ['HS256'],
      });
    } catch {
      return null;
    }
  }
}
