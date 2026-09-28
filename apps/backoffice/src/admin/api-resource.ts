import { BaseRecord, BaseResource, BaseProperty, type Filter } from 'adminjs';

type FindOptions = {
  limit?: number;
  offset?: number;
  sort?: { sortBy?: string; direction?: 'asc' | 'desc' };
};

export interface ApiResourceConfig<T extends { id: string }> {
  /** Resource id used in URLs and translation keys. */
  id: string;
  properties: BaseProperty[];
  /** AdminJS filter path -> query parameter understood by the API. */
  filterParams: Record<string, string>;
  list(params: Record<string, unknown>): Promise<{ items: T[]; total: number }>;
  get(id: string): Promise<T>;
  update?(id: string, params: Record<string, unknown>): Promise<T>;
  remove?(id: string): Promise<void>;
}

/**
 * AdminJS resource backed by the NestJS API rather than by a database.
 *
 * The backoffice holds no database connection: every read and write goes
 * through the API's /admin endpoints, which enforce the admin role themselves.
 * That keeps a single writer in front of the data and means the backoffice
 * needs neither the database password nor Cloud SQL access when deployed.
 *
 * Credentials are not passed as arguments — AdminJS does not hand resources the
 * Express request — but read from the AsyncLocalStorage context; see
 * api/request-context.ts.
 */
export class ApiResource<T extends { id: string }> extends BaseResource {
  constructor(private readonly config: ApiResourceConfig<T>) {
    super();
  }

  id(): string {
    return this.config.id;
  }

  databaseName(): string {
    return 'audioguide-api';
  }

  databaseType(): string {
    return 'rest';
  }

  properties(): BaseProperty[] {
    return this.config.properties;
  }

  property(path: string): BaseProperty | null {
    return this.config.properties.find((p) => p.path() === path) ?? null;
  }

  /** Turns AdminJS filters into the query parameters the API understands. */
  private toQuery(filter?: Filter): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const filters = filter?.filters ?? {};
    for (const [path, element] of Object.entries(filters)) {
      const param = this.config.filterParams[path];
      // Unknown filters are dropped rather than forwarded: the API validates
      // its query parameters strictly and would answer 400.
      if (param) params[param] = (element as { value: unknown }).value;
    }
    return params;
  }

  async count(filter: Filter): Promise<number> {
    // The API reports the total alongside the page, so the cheapest count is a
    // one-item page.
    const { total } = await this.config.list({
      ...this.toQuery(filter),
      page: 1,
      limit: 1,
    });
    return total;
  }

  async find(filter: Filter, options: FindOptions): Promise<BaseRecord[]> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const { items } = await this.config.list({
      ...this.toQuery(filter),
      page: Math.floor(offset / limit) + 1,
      limit,
      sort_by: options.sort?.sortBy,
      direction: options.sort?.direction,
    });

    return items.map((item) => new BaseRecord(item, this));
  }

  async findOne(id: string): Promise<BaseRecord | null> {
    try {
      return new BaseRecord(await this.config.get(id), this);
    } catch {
      return null;
    }
  }

  async findMany(ids: Array<string | number>): Promise<BaseRecord[]> {
    const records = await Promise.all(
      ids.map((id) => this.findOne(String(id))),
    );
    return records.filter((record): record is BaseRecord => record !== null);
  }

  create(): Promise<Record<string, unknown>> {
    // Creation is disabled on both resources: an audioguide comes from the
    // generation pipeline, and an account from POST /auth/signup.
    return Promise.reject(
      new Error(`Creating a ${this.config.id} is not supported here.`),
    );
  }

  async update(
    id: string,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (!this.config.update) {
      throw new Error(`Updating a ${this.config.id} is not supported here.`);
    }
    return (await this.config.update(id, params)) as unknown as Record<
      string,
      unknown
    >;
  }

  async delete(id: string): Promise<void> {
    if (!this.config.remove) {
      throw new Error(`Deleting a ${this.config.id} is not supported here.`);
    }
    await this.config.remove(id);
  }
}
