import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AudioguideAttributes } from '../types/attributes.js';

// Miroir de l'entité de l'API. Deux contraintes dictent cette forme :
//  - `BaseEntity` (Active Record) est exigé par @adminjs/typeorm, qui reconnaît
//    ses ressources via `getRepository()` sur la classe ;
//  - les types de colonne sont déclarés explicitement, car le backoffice tourne
//    aussi sous tsx/esbuild, qui n'émet pas les métadonnées de décorateurs.
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
