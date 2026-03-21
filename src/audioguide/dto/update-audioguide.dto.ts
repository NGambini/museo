import { PartialType } from '@nestjs/swagger';
import { CreateAudioguideDto } from './create-audioguide.dto';

export class UpdateAudioguideDto extends PartialType(CreateAudioguideDto) {}
