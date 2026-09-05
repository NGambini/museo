import { buildAudioguidePrompt } from './audioguide.prompts';

describe('buildAudioguidePrompt', () => {
  it('includes the placeName in the prompt', () => {
    const prompt = buildAudioguidePrompt('Tour Eiffel', 'fr');
    expect(prompt).toContain('Tour Eiffel');
  });

  it('uses "français" when lang === "fr"', () => {
    const prompt = buildAudioguidePrompt('Louvre', 'fr');
    expect(prompt).toContain('français');
    expect(prompt).not.toContain('en fr,');
  });

  it('uses the language as-is when lang !== "fr"', () => {
    const prompt = buildAudioguidePrompt('Colosseum', 'en');
    expect(prompt).toContain('en en');
  });

  it('contains the expected JSON template', () => {
    const prompt = buildAudioguidePrompt('Versailles', 'fr');
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"history"');
    expect(prompt).toContain('"chapters"');
    expect(prompt).toContain('"chapter_number"');
    expect(prompt).toContain('"lines"');
    expect(prompt).toContain('"image_search_query"');
  });

  it('mentions the 3 to 5 chapters constraint', () => {
    const prompt = buildAudioguidePrompt('Big Ben', 'fr');
    expect(prompt).toContain('3');
    expect(prompt).toContain('5');
  });
});
