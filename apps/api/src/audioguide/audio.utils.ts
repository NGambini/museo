// Chirp voices give no SSML <mark> timepoints, so each karaoke line is synthesized
// on its own and stitched back together here — the line boundaries are then known
// exactly from the sample counts instead of reported by TTS.

export interface PcmAudio {
  sampleRate: number;
  samples: Int16Array;
}

export interface StitchedAudio extends PcmAudio {
  /** Start offset of each line in the stitched audio, in seconds. */
  lineStartSeconds: number[];
}

/** Reads a 16-bit mono RIFF/WAVE buffer as produced by TTS `LINEAR16` output. */
export function parseWav(wav: Buffer): PcmAudio {
  if (
    wav.toString('ascii', 0, 4) !== 'RIFF' ||
    wav.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    throw new Error('Not a RIFF/WAVE buffer');
  }

  let sampleRate: number | undefined;
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const chunkId = wav.toString('ascii', offset, offset + 4);
    const chunkSize = wav.readUInt32LE(offset + 4);
    const body = offset + 8;

    if (chunkId === 'fmt ') {
      const channels = wav.readUInt16LE(body + 2);
      const bitsPerSample = wav.readUInt16LE(body + 14);
      if (channels !== 1 || bitsPerSample !== 16) {
        throw new Error(
          `Expected 16-bit mono WAV, got ${bitsPerSample}-bit ${channels}ch`,
        );
      }
      sampleRate = wav.readUInt32LE(body + 4);
    } else if (chunkId === 'data') {
      if (sampleRate === undefined)
        throw new Error('WAV data chunk before fmt chunk');
      // Some encoders write 0 or 0xFFFFFFFF when streaming; trust the buffer then.
      const end =
        chunkSize && body + chunkSize <= wav.length
          ? body + chunkSize
          : wav.length;
      const bytes = wav.subarray(body, end - ((end - body) % 2));
      // Copy so the Int16Array is aligned regardless of the header length.
      const samples = new Int16Array(bytes.length / 2);
      for (let i = 0; i < samples.length; i++)
        samples[i] = bytes.readInt16LE(i * 2);
      return { sampleRate, samples };
    }
    offset = body + chunkSize + (chunkSize % 2);
  }
  throw new Error('WAV buffer has no data chunk');
}

/** Concatenates one PCM clip per line, separated by `gapSeconds` of silence, and records where each line starts. */
export function stitchLines(
  clips: PcmAudio[],
  gapSeconds: number,
): StitchedAudio {
  if (clips.length === 0) throw new Error('No audio clips to stitch');
  const { sampleRate } = clips[0];
  if (clips.some((c) => c.sampleRate !== sampleRate)) {
    throw new Error('All clips must share the same sample rate');
  }

  const gap = Math.round(gapSeconds * sampleRate);
  const total =
    clips.reduce((n, c) => n + c.samples.length, 0) + gap * (clips.length - 1);
  const samples = new Int16Array(total);
  const lineStartSeconds: number[] = [];

  let cursor = 0;
  clips.forEach((clip, i) => {
    if (i > 0) cursor += gap; // Int16Array is zero-filled, so the gap is already silence
    lineStartSeconds.push(cursor / sampleRate);
    samples.set(clip.samples, cursor);
    cursor += clip.samples.length;
  });

  return { sampleRate, samples, lineStartSeconds };
}

const MP3_KBPS = 64;

/** Encodes mono PCM to MP3. lamejs is ESM-only, hence the dynamic import from this CommonJS build. */
export async function encodeMp3({
  sampleRate,
  samples,
}: PcmAudio): Promise<Buffer> {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const encoder = new Mp3Encoder(1, sampleRate, MP3_KBPS);
  // lamejs actually returns Int8Array views despite its typings; re-view the bytes.
  const asBuffer = (a: ArrayBufferView) =>
    Buffer.from(a.buffer, a.byteOffset, a.byteLength);
  return Buffer.concat([
    asBuffer(encoder.encodeBuffer(samples)),
    asBuffer(encoder.flush()),
  ]);
}
