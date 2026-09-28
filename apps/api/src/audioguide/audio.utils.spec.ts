import { parseWav, stitchLines } from './audio.utils';

/** Minimal 16-bit mono WAV, with an optional extra chunk before `data` like real encoders emit. */
function makeWav(
  samples: number[],
  sampleRate = 24000,
  withListChunk = false,
): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(s, i * 2));

  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0); // PCM
  fmt.writeUInt16LE(1, 2); // mono
  fmt.writeUInt32LE(sampleRate, 4);
  fmt.writeUInt32LE(sampleRate * 2, 8);
  fmt.writeUInt16LE(2, 12);
  fmt.writeUInt16LE(16, 14);

  const chunk = (id: string, body: Buffer) => {
    const header = Buffer.alloc(8);
    header.write(id, 0, 'ascii');
    header.writeUInt32LE(body.length, 4);
    const pad = body.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0); // RIFF pads odd chunks
    return Buffer.concat([header, body, pad]);
  };

  const chunks = [chunk('fmt ', fmt)];
  if (withListChunk) chunks.push(chunk('LIST', Buffer.from('INFOabc'))); // odd-sized: needs padding
  chunks.push(chunk('data', data));
  const body = Buffer.concat(chunks);

  const riff = Buffer.alloc(12);
  riff.write('RIFF', 0, 'ascii');
  riff.writeUInt32LE(4 + body.length, 4);
  riff.write('WAVE', 8, 'ascii');
  return Buffer.concat([riff, body]);
}

describe('parseWav', () => {
  it('reads sample rate and samples', () => {
    const { sampleRate, samples } = parseWav(makeWav([1, -2, 3], 16000));
    expect(sampleRate).toBe(16000);
    expect(Array.from(samples)).toEqual([1, -2, 3]);
  });

  it('skips unknown chunks (with odd-size padding) before data', () => {
    const { samples } = parseWav(makeWav([7, 8], 24000, true));
    expect(Array.from(samples)).toEqual([7, 8]);
  });

  it('rejects non-WAV buffers', () => {
    expect(() => parseWav(Buffer.from('ID3 not a wav'))).toThrow('RIFF');
  });
});

describe('stitchLines', () => {
  it('concatenates clips with a silent gap and reports where each line starts', () => {
    const clip = (n: number) => ({
      sampleRate: 1000,
      samples: new Int16Array(n).fill(5),
    });
    const { samples, lineStartSeconds } = stitchLines(
      [clip(1000), clip(500), clip(250)],
      0.1,
    );
    expect(samples.length).toBe(1000 + 100 + 500 + 100 + 250);
    expect(lineStartSeconds).toEqual([0, 1.1, 1.7]);
    expect(samples[1000]).toBe(0); // gap is silence
    expect(samples[1100]).toBe(5); // second clip starts right after it
  });

  it('refuses clips with mismatched sample rates', () => {
    expect(() =>
      stitchLines(
        [
          { sampleRate: 24000, samples: new Int16Array(1) },
          { sampleRate: 16000, samples: new Int16Array(1) },
        ],
        0,
      ),
    ).toThrow('sample rate');
  });
});
