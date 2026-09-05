import React from 'react';
import type { ShowPropertyProps } from 'adminjs';
import { Box, Button, Loader, MessageBox, Text } from '@adminjs/design-system';

interface Chapter {
  chapter_number: number;
  title?: string;
  description?: string;
  text?: string;
  lines?: string[];
  transcript?: string;
  image_url?: string;
  audio_url?: string;
}

interface Attributes {
  title?: string;
  history?: string;
  admission_price?: string | null;
  rating?: number | null;
  main_image_url?: string | null;
  chapters?: Chapter[];
}

const monospace = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    px="default"
    py="xs"
    bg="grey20"
    borderRadius="default"
    style={{ display: 'inline-block' }}
  >
    <Text fontSize="sm">{children}</Text>
  </Box>
);

/**
 * Vue lecture du jsonb, avec les médias jouables.
 *
 * La base ne contient que des chemins GCS : on redemande l'enregistrement à
 * l'API (`GET /audioguides/:id`), qui renvoie les mêmes attributs avec des URLs
 * signées valables une heure. Le backoffice n'a donc aucun accès direct au
 * bucket ni aucun credential Google à porter.
 */
const AttributesShow: React.FC<ShowPropertyProps> = ({ record }) => {
  const recordId = (record?.params?.id as string) ?? record?.id;

  const [attributes, setAttributes] = React.useState<Attributes | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});

  const load = React.useCallback(async () => {
    if (!recordId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/bo-api/audioguides/${recordId}/media`, {
        credentials: 'same-origin',
      });
      const body = (await response.json()) as {
        attributes?: Attributes;
        message?: string;
      };
      if (!response.ok)
        throw new Error(body.message ?? `HTTP ${response.status}`);
      setAttributes(body.attributes ?? {});
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Box p="xl" flex justifyContent="center">
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <MessageBox variant="danger" message="Médias indisponibles">
        {error}
        <Box mt="lg">
          <Button
            type="button"
            size="sm"
            variant="contained"
            onClick={() => void load()}
          >
            Réessayer
          </Button>
        </Box>
      </MessageBox>
    );
  }

  const chapters = attributes?.chapters ?? [];

  return (
    <Box>
      <Box
        mb="xl"
        p="xl"
        border="default"
        borderRadius="default"
        bg="white"
        flex
        flexDirection="row"
        style={{ gap: 24 }}
      >
        {attributes?.main_image_url ? (
          <img
            src={attributes.main_image_url}
            alt=""
            style={{
              width: 180,
              height: 180,
              objectFit: 'cover',
              borderRadius: 8,
              flexShrink: 0,
            }}
          />
        ) : null}
        <Box flexGrow={1}>
          <Text fontSize="xl" fontWeight="bold" mb="default">
            {attributes?.title || 'Sans titre'}
          </Text>
          <Box
            flex
            flexDirection="row"
            mb="lg"
            style={{ gap: 8, flexWrap: 'wrap' }}
          >
            <Pill>
              {chapters.length} chapitre{chapters.length > 1 ? 's' : ''}
            </Pill>
            {attributes?.rating != null ? (
              <Pill>★ {attributes.rating}</Pill>
            ) : null}
            <Pill>{attributes?.admission_price || 'Tarif inconnu'}</Pill>
          </Box>
          <Text color="grey80">{attributes?.history}</Text>
        </Box>
      </Box>

      <Box mb="lg" flex flexDirection="row" justifyContent="space-between">
        <Text fontWeight="bold">Chapitres</Text>
        <Text fontSize="sm" color="grey60">
          URLs signées valables 1 h —{' '}
          <span
            role="button"
            tabIndex={0}
            style={{ textDecoration: 'underline', cursor: 'pointer' }}
            onClick={() => void load()}
            onKeyDown={(event) => event.key === 'Enter' && void load()}
          >
            rafraîchir
          </span>
        </Text>
      </Box>

      {chapters.length === 0 ? (
        <MessageBox variant="info" message="Aucun chapitre">
          Cet audioguide n’a pas encore de contenu.
        </MessageBox>
      ) : null}

      {chapters.map((chapter, index) => {
        const isOpen = expanded[index] ?? false;
        return (
          <Box
            key={index}
            mb="lg"
            p="lg"
            border="default"
            borderRadius="default"
            bg="white"
          >
            <Box flex flexDirection="row" style={{ gap: 16 }}>
              {chapter.image_url ? (
                <img
                  src={chapter.image_url}
                  alt=""
                  style={{
                    width: 96,
                    height: 96,
                    objectFit: 'cover',
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <Box
                  bg="grey20"
                  borderRadius="default"
                  flex
                  alignItems="center"
                  justifyContent="center"
                  style={{ width: 96, height: 96, flexShrink: 0 }}
                >
                  <Text fontSize="sm" color="grey60">
                    sans image
                  </Text>
                </Box>
              )}

              <Box flexGrow={1} style={{ minWidth: 0 }}>
                <Text fontWeight="bold">
                  {chapter.chapter_number}. {chapter.title || 'Sans titre'}
                </Text>
                <Text fontSize="sm" color="grey60" mb="default">
                  {chapter.description}
                </Text>

                {chapter.audio_url ? (
                  <audio
                    controls
                    preload="none"
                    src={chapter.audio_url}
                    style={{ width: '100%', maxWidth: 520 }}
                  />
                ) : (
                  <Text fontSize="sm" color="grey60">
                    <em>aucune piste audio</em>
                  </Text>
                )}

                {chapter.text || chapter.transcript || chapter.lines?.length ? (
                  <Box mt="default">
                    <span
                      role="button"
                      tabIndex={0}
                      style={{
                        fontSize: 13,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        setExpanded((state) => ({ ...state, [index]: !isOpen }))
                      }
                      onKeyDown={(event) =>
                        event.key === 'Enter' &&
                        setExpanded((state) => ({ ...state, [index]: !isOpen }))
                      }
                    >
                      {isOpen ? '▾ masquer le texte' : '▸ voir le texte'}
                    </span>
                  </Box>
                ) : null}
              </Box>
            </Box>

            {isOpen ? (
              <Box mt="lg" pt="lg" borderTop="default">
                {chapter.text ? (
                  <Box mb="lg">
                    <Text fontSize="sm" fontWeight="bold" mb="xs">
                      Texte narré
                    </Text>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>
                      {chapter.text}
                    </Text>
                  </Box>
                ) : null}
                {chapter.lines?.length ? (
                  <Box mb="lg">
                    <Text fontSize="sm" fontWeight="bold" mb="xs">
                      Lignes karaoké ({chapter.lines.length})
                    </Text>
                    <Box as="ol" pl="xl">
                      {chapter.lines.map((line, i) => (
                        <Text as="li" key={i} fontSize="sm" color="grey80">
                          {line}
                        </Text>
                      ))}
                    </Box>
                  </Box>
                ) : null}
                {chapter.transcript ? (
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" mb="xs">
                      Transcript
                    </Text>
                    <Text
                      fontSize="sm"
                      style={{ fontFamily: monospace, whiteSpace: 'pre-wrap' }}
                    >
                      {chapter.transcript}
                    </Text>
                  </Box>
                ) : null}
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
};

export default AttributesShow;
