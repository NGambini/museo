import React from 'react';
import {
  Box,
  Button,
  H3,
  Input,
  Label,
  Link,
  Loader,
  MessageBox,
  Select,
  Text,
} from '@adminjs/design-system';

/** What the design-system fields actually hand to their onChange. */
interface ValueChangeEvent {
  target: { value: string };
}

interface Prediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface GeneratedAudioguide {
  id: string;
  placeName: string;
  lang: string;
  attributes?: { title?: string; chapters?: unknown[] };
}

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
  { value: 'es', label: 'Espagnol' },
  { value: 'de', label: 'Allemand' },
  { value: 'it', label: 'Italien' },
];

/**
 * The page is served under `${rootPath}/pages/generate`, so rootPath is derived
 * from the URL rather than hard-coded, keeping links correct if the AdminJS
 * configuration changes.
 */
function rootPath(): string {
  const [prefix] = window.location.pathname.split('/pages/');
  return prefix || '/admin';
}

const GeneratePage: React.FC = () => {
  const [query, setQuery] = React.useState('');
  const [predictions, setPredictions] = React.useState<Prediction[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  const [selected, setSelected] = React.useState<Prediction | null>(null);
  const [lang, setLang] = React.useState('fr');
  const [existing, setExisting] = React.useState<{
    exists: boolean;
    id?: string;
    placeName?: string;
  } | null>(null);

  const [generating, setGenerating] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [result, setResult] = React.useState<GeneratedAudioguide | null>(null);
  const [generateError, setGenerateError] = React.useState<string | null>(null);

  // ── Google Places autocomplete, debounced ──────────────────────────────────
  React.useEffect(() => {
    const input = query.trim();
    if (selected && input === selected.description) return;
    if (input.length < 3) {
      setPredictions([]);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const response = await fetch(
          `/bo-api/places/autocomplete?q=${encodeURIComponent(input)}&lang=${lang}`,
          { credentials: 'same-origin', signal: controller.signal },
        );
        const body = (await response.json()) as {
          predictions?: Prediction[];
          message?: string;
        };
        if (!response.ok)
          throw new Error(body.message ?? `HTTP ${response.status}`);
        setPredictions(body.predictions ?? []);
      } catch (caught) {
        if ((caught as Error).name !== 'AbortError') {
          setSearchError((caught as Error).message);
        }
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, lang, selected]);

  // ── Is this place_id already in the catalogue? ─────────────────────────────
  React.useEffect(() => {
    if (!selected) {
      setExisting(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          `/bo-api/places/${encodeURIComponent(selected.place_id)}/existing?lang=${lang}`,
          { credentials: 'same-origin' },
        );
        const body = (await response.json()) as {
          exists: boolean;
          id?: string;
        };
        if (!cancelled) setExisting(body);
      } catch {
        if (!cancelled) setExisting(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, lang]);

  // Waiting counter: generation runs Gemini and then text-to-speech for every
  // chapter, and the API cuts off at 60 s.
  React.useEffect(() => {
    if (!generating) return;
    const started = Date.now();
    const interval = window.setInterval(
      () => setElapsed(Math.round((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [generating]);

  const pick = (prediction: Prediction) => {
    setSelected(prediction);
    setQuery(prediction.description);
    setPredictions([]);
    setResult(null);
    setGenerateError(null);
  };

  const reset = () => {
    setSelected(null);
    setQuery('');
    setPredictions([]);
    setResult(null);
    setGenerateError(null);
    setExisting(null);
  };

  const generate = async () => {
    if (!selected) return;
    setGenerating(true);
    setElapsed(0);
    setResult(null);
    setGenerateError(null);
    try {
      const response = await fetch('/bo-api/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: selected.place_id, lang }),
      });
      const body = (await response.json()) as GeneratedAudioguide & {
        message?: string;
      };
      if (!response.ok)
        throw new Error(body.message ?? `HTTP ${response.status}`);
      setResult(body);
    } catch (caught) {
      setGenerateError((caught as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Box variant="grey" style={{ minHeight: '100%' }}>
      <Box variant="white" mb="xl">
        <H3>Générer un audioguide</H3>
        <Text color="grey60">
          Cherche un lieu, choisis la langue, lance la génération. L’API
          réutilise l’audioguide existant s’il y en a déjà un pour ce couple
          lieu + langue — aucun appel payant n’est alors déclenché.
        </Text>
      </Box>

      <Box variant="white" mb="xl">
        <Label>Lieu (Google Places)</Label>
        <Input
          width="100%"
          value={query}
          placeholder="Palais idéal du facteur Cheval, Musée Champollion…"
          onChange={(event: ValueChangeEvent) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
        />

        {searching ? (
          <Text mt="default" fontSize="sm" color="grey60">
            Recherche…
          </Text>
        ) : null}

        {searchError ? (
          <MessageBox
            variant="danger"
            message="Recherche impossible"
            mt="default"
          >
            {searchError}
          </MessageBox>
        ) : null}

        {predictions.length > 0 ? (
          <Box mt="default" border="default" borderRadius="default">
            {predictions.map((prediction) => (
              <Box
                key={prediction.place_id}
                p="lg"
                borderBottom="default"
                style={{ cursor: 'pointer' }}
                onClick={() => pick(prediction)}
              >
                <Text fontWeight="bold">{prediction.main_text}</Text>
                <Text fontSize="sm" color="grey60">
                  {prediction.secondary_text}
                </Text>
              </Box>
            ))}
          </Box>
        ) : null}

        {query.trim().length >= 3 &&
        !searching &&
        !selected &&
        predictions.length === 0 &&
        !searchError ? (
          <Text mt="default" fontSize="sm" color="grey60">
            Aucun lieu trouvé.
          </Text>
        ) : null}
      </Box>

      {selected ? (
        <Box variant="white" mb="xl">
          <Box flex flexDirection="row" justifyContent="space-between" mb="lg">
            <Box>
              <Text fontWeight="bold">{selected.main_text}</Text>
              <Text fontSize="sm" color="grey60">
                {selected.secondary_text}
              </Text>
              <Text
                mt="xs"
                fontSize="sm"
                color="grey60"
                style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}
              >
                {selected.place_id}
              </Text>
            </Box>
            <Button
              type="button"
              size="sm"
              variant="contained"
              color="secondary"
              onClick={reset}
            >
              Changer de lieu
            </Button>
          </Box>

          <Box mb="lg" style={{ maxWidth: 260 }}>
            <Label>Langue</Label>
            <Select
              value={LANGUAGES.find((option) => option.value === lang)}
              options={LANGUAGES}
              isDisabled={generating}
              onChange={(option) =>
                setLang((option as { value: string } | null)?.value ?? 'fr')
              }
            />
          </Box>

          {existing?.exists ? (
            <MessageBox variant="info" message="Déjà au catalogue" mb="lg">
              Un audioguide existe pour ce lieu en « {lang} ». Générer renverra
              l’existant sans rien recalculer.{' '}
              <Link
                href={`${rootPath()}/resources/Audioguide/records/${existing.id}/show`}
              >
                L’ouvrir
              </Link>
            </MessageBox>
          ) : null}

          <Button
            type="button"
            variant="contained"
            disabled={generating}
            onClick={() => void generate()}
          >
            {generating ? 'Génération en cours…' : 'Générer'}
          </Button>

          {generating ? (
            <Box
              mt="lg"
              flex
              flexDirection="row"
              alignItems="center"
              style={{ gap: 12 }}
            >
              <Loader />
              <Text color="grey60">
                {elapsed}s écoulées — texte, images et synthèse vocale de chaque
                chapitre. L’API coupe à 60 s.
              </Text>
            </Box>
          ) : null}

          {generateError ? (
            <MessageBox variant="danger" message="Génération en échec" mt="lg">
              {generateError}
            </MessageBox>
          ) : null}

          {result ? (
            <MessageBox
              variant="success"
              message="Audioguide disponible"
              mt="lg"
            >
              <Text mb="default">
                « {result.attributes?.title || result.placeName} » —{' '}
                {result.attributes?.chapters?.length ?? 0} chapitre(s).
              </Text>
              <Link
                href={`${rootPath()}/resources/Audioguide/records/${result.id}/show`}
              >
                Ouvrir la fiche et écouter
              </Link>
            </MessageBox>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
};

export default GeneratePage;
