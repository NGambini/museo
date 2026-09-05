import { DataSource } from 'typeorm';
import { env } from '../config/env.js';
import { Audioguide } from '../entities/audioguide.entity.js';
import { User } from '../entities/user.entity.js';

// `synchronize: false`, non-negotiable: the schema belongs to the API and the
// backoffice only reads from and writes to the existing tables.
export const dataSource = new DataSource({
  type: 'postgres',
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  entities: [Audioguide, User],
  synchronize: false,
  logging: false,
});
