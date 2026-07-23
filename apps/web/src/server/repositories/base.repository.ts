import type {
  FilterQuery,
  Model,
  PipelineStage,
  ProjectionType,
  SortOrder,
  UpdateQuery,
} from 'mongoose';
import { Types } from 'mongoose';
import { NotFoundError } from '../errors/app-error';

export interface ListOptions<T> {
  page: number;
  limit: number;
  sort?: Record<string, SortOrder>;
  projection?: ProjectionType<T>;
  populate?: string | string[];
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

/**
 * Tenant-scoped data access. EVERY read and write is automatically
 * constrained to the given communityId — isolation is enforced here,
 * structurally, rather than trusting each endpoint to remember a filter.
 *
 * Cross-tenant access (super-admin community management) uses the models
 * directly in dedicated repositories, never through this class.
 */
export abstract class BaseRepository<TDoc> {
  protected constructor(protected readonly model: Model<TDoc>) {}

  protected scope(communityId: string, filter: FilterQuery<TDoc> = {}): FilterQuery<TDoc> {
    return { ...filter, communityId: new Types.ObjectId(communityId) } as FilterQuery<TDoc>;
  }

  async create(communityId: string, data: Partial<TDoc>): Promise<TDoc> {
    const doc = await this.model.create({ ...data, communityId });
    return doc.toObject() as TDoc;
  }

  async findById(communityId: string, id: string): Promise<TDoc | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findOne(this.scope(communityId, { _id: id } as FilterQuery<TDoc>)).lean<TDoc>();
  }

  /** Like findById but throws NotFoundError — for handlers that require existence. */
  async findByIdOrThrow(communityId: string, id: string, resource = 'Resource'): Promise<TDoc> {
    const doc = await this.findById(communityId, id);
    if (!doc) throw new NotFoundError(resource);
    return doc;
  }

  async findOne(communityId: string, filter: FilterQuery<TDoc>): Promise<TDoc | null> {
    return this.model.findOne(this.scope(communityId, filter)).lean<TDoc>();
  }

  async findMany(communityId: string, filter: FilterQuery<TDoc> = {}): Promise<TDoc[]> {
    return this.model.find(this.scope(communityId, filter)).lean<TDoc[]>();
  }

  async list(
    communityId: string,
    filter: FilterQuery<TDoc>,
    options: ListOptions<TDoc>
  ): Promise<ListResult<TDoc>> {
    const scoped = this.scope(communityId, filter);
    let query = this.model
      .find(scoped, options.projection)
      .sort(options.sort ?? { createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);
    if (options.populate) query = query.populate(options.populate);
    const [items, total] = await Promise.all([
      query.lean<TDoc[]>(),
      this.model.countDocuments(scoped),
    ]);
    return { items, total };
  }

  async updateById(
    communityId: string,
    id: string,
    update: UpdateQuery<TDoc>
  ): Promise<TDoc | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOneAndUpdate(this.scope(communityId, { _id: id } as FilterQuery<TDoc>), update, {
        new: true,
        runValidators: true,
      })
      .lean<TDoc>();
  }

  async updateMany(
    communityId: string,
    filter: FilterQuery<TDoc>,
    update: UpdateQuery<TDoc>
  ): Promise<number> {
    const res = await this.model.updateMany(this.scope(communityId, filter), update);
    return res.modifiedCount;
  }

  async deleteById(communityId: string, id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const res = await this.model.deleteOne(this.scope(communityId, { _id: id } as FilterQuery<TDoc>));
    return res.deletedCount > 0;
  }

  async count(communityId: string, filter: FilterQuery<TDoc> = {}): Promise<number> {
    return this.model.countDocuments(this.scope(communityId, filter));
  }

  async exists(communityId: string, filter: FilterQuery<TDoc>): Promise<boolean> {
    const found = await this.model.exists(this.scope(communityId, filter));
    return found !== null;
  }

  /** Tenant-scoped aggregation: communityId match is always prepended. */
  async aggregate<R>(communityId: string, pipeline: PipelineStage[]): Promise<R[]> {
    return this.model.aggregate<R>([
      { $match: { communityId: new Types.ObjectId(communityId) } },
      ...pipeline,
    ]);
  }
}
