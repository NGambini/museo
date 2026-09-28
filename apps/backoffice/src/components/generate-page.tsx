import React from 'react';
import { io, type Socket } from 'socket.io-client';
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

type GenerationStep =
  | 'queued'
  | 'place_details'
  | 'main_photo'
  | 'writing'
  | 'images'
  | 'audio'
  | 'saving'
  | 'done'
  | 'failed';

interface GenerationJob {
  id: string;
  step: GenerationStep;
  progress: number;
  message: string;
  audioguideId?: string;
  error?: string;
}

/** Shown instead of the API's English message, which is meant for logs. */
const STEP_LABELS: Record<GenerationStep, string> = {
  queued: 'En attente',
  place_details: 'Lecture de la fiche du lieu',
  main_photo: 'Récupération de la photo principale',
  writing: 'Rédaction du texte',
  images: 'Recherche des illustrations',
  audio: 'Enregistrement des chapitres',
  saving: 'Enregistrement',
  done: 'Terminé',
  failed: 'Échec',
};

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

  const [job, setJob] = React.useState<GenerationJob | null>(null);
  const [generateError, setGenerateError] = React.useState<string | null>(null);
  const socketRef = React.useRef<Socket | null>(null);

  const generating =
    job !== null && job.step !== 'done' && job.step !== 'failed';

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

  /**
   * The socket is opened once, when the page mounts, and kept for its lifetime.
   * Progress for a generation that outlives an HTTP request has to be pushed,
   * and reconnection is socket.io's job rather than ours.
   */
  React.useEffect(() => {
    const socket = io({ path: '/bo-ws', transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('generation:update', (incoming: GenerationJob) => {
      // Every admin sees every job; only ours concerns this page.
      setJob((current) =>
        current && incoming.id === current.id ? incoming : current,
      );
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  /**
   * Safety net for the gap between the 202 and the socket catching up, and for
   * a reconnection that missed the final event.
   */
  React.useEffect(() => {
    if (!job || !generating) return;

    const poll = window.setInterval(async () => {
      try {
        const response = await fetch(`/bo-api/jobs/${job.id}`, {
          credentials: 'same-origin',
        });
        if (response.ok) setJob((await response.json()) as GenerationJob);
      } catch {
        // The socket is the normal path; a failed poll is not worth surfacing.
      }
    }, 5000);

    return () => window.clearInterval(poll);
  }, [job, generating]);

  const pick = (prediction: Prediction) => {
    setSelected(prediction);
    setQuery(prediction.description);
    setPredictions([]);
    setJob(null);
    setGenerateError(null);
  };

  const reset = () => {
    setSelected(null);
    setQuery('');
    setPredictions([]);
    setJob(null);
    setGenerateError(null);
    setExisting(null);
  };

  const generate = async () => {
    if (!selected) return;
    setJob(null);
    setGenerateError(null);
    try {
      const response = await fetch('/bo-api/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: selected.place_id, lang }),
      });
      const body = (await response.json()) as GenerationJob & {
        message?: string;
      };
      // 202 means the work was accepted, not finished — except on a cache hit,
      // where the API hands back a job already marked done.
      if (!response.ok)
        throw new Error(body.message ?? `HTTP ${response.status}`);
      setJob(body);
    } catch (caught) {
      setGenerateError((caught as Error).message);
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

          {job && generating ? (
            <Box mt="lg">
              <Box
                flex
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                mb="default"
              >
                <Text color="grey80">{STEP_LABELS[job.step]}</Text>
                <Text color="grey60" fontSize="sm">
                  {Math.round(job.progress * 100)} %
                </Text>
              </Box>

              <Box
                bg="grey20"
                borderRadius="default"
                style={{ height: 8, overflow: 'hidden' }}
              >
                <Box
                  bg="primary100"
                  style={{
                    height: '100%',
                    width: `${Math.max(3, Math.round(job.progress * 100))}%`,
                    transition: 'width 400ms ease',
                  }}
                />
              </Box>

              <Text mt="default" fontSize="sm" color="grey60">
                Tu peux quitter cette page, la génération continue côté serveur.
              </Text>
            </Box>
          ) : null}

          {generateError ? (
            <MessageBox variant="danger" message="Génération en échec" mt="lg">
              {generateError}
            </MessageBox>
          ) : null}

          {job?.step === 'failed' ? (
            <MessageBox variant="danger" message="Génération en échec" mt="lg">
              {job.error ?? 'Raison inconnue.'}
            </MessageBox>
          ) : null}

          {job?.step === 'done' && job.audioguideId ? (
            <MessageBox
              variant="success"
              message="Audioguide disponible"
              mt="lg"
            >
              <Link
                href={`${rootPath()}/resources/Audioguide/records/${job.audioguideId}/show`}
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
