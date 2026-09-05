import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AudioguideAttributes } from '../types/attributes.js';

// Mirror of the API's entity. Two constraints dictate this shape:
//  - `BaseEntity` (Active Record) is required by @adminjs/typeorm, which detects
//    its resources by calling `getRepository()` on the class;
//  - column types are declared explicitly, because the backoffice also runs
//    under tsx/esbuild, which does not emit decorator metadata.
@Entity({ name: 'audioguides' })
export class Audioguide extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'place_id' })
  placeId!: string;

  @Column({ type: 'varchar', name: 'place_name' })
  placeName!: string;

  @Column({ type: 'float' })
  latitude!: number;

  @Column({ type: 'float' })
  longitude!: number;

  @Column({ type: 'varchar', default: 'fr' })
  lang!: string;

  @Column({ type: 'jsonb', default: {} })
  attributes!: AudioguideAttributes;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
