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

  it('asks the title to name something specific rather than promise a feeling', () => {
    const prompt = buildAudioguidePrompt('Abbaye Saint-Victor', 'fr');
    expect(prompt).toContain('Pour title :');
    expect(prompt).toContain("qu'on ne trouve que dans ce lieu");
    expect(prompt).toContain("l'aventure de");
  });

  it('asks the register to follow the nature of the place', () => {
    const prompt = buildAudioguidePrompt('Mémorial', 'fr');
    expect(prompt).toContain('Adapte le registre au lieu');
    expect(prompt).toContain('sobriété');
  });

  it('makes the origin story conditional on the building being the subject', () => {
    const prompt = buildAudioguidePrompt('Musée Champollion', 'fr');
    expect(prompt).toContain("Raconte l'origine du lieu quand elle éclaire");
    expect(prompt).toContain('contenant récent');
  });

  it('avoids the words that prime an adventure register', () => {
    const prompt = buildAudioguidePrompt('Louvre', 'fr');
    expect(prompt).not.toContain('captivant');
    // "fun" also matches inside other words, so check the phrase it sat in.
    expect(prompt).not.toContain('fun et éducatif');
  });

  it('mentions the 3 to 5 chapters constraint', () => {
    const prompt = buildAudioguidePrompt('Big Ben', 'fr');
    expect(prompt).toContain('3');
    expect(prompt).toContain('5');
  });
});
