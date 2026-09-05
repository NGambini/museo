import React from 'react';
import { flat, type EditPropertyProps, type RecordJSON } from 'adminjs';
import {
  Box,
  Button,
  Input,
  Label,
  MessageBox,
  Section,
  Text,
  TextArea,
} from '@adminjs/design-system';

/** Ce que les champs du design-system exposent réellement à leur onChange. */
interface ValueChangeEvent {
  target: { value: string };
}

interface Chapter {
  chapter_number: number;
  title: string;
  description: string;
  lines?: string[];
  text?: string;
  image_search_query?: string;
  image_url?: string;
  audio_url?: string;
  transcript?: string;
  [key: string]: unknown;
}

interface Attributes {
  title?: string;
  history?: string;
  admission_price?: string | null;
  rating?: number | null;
  main_image_url?: string | null;
  chapters?: Chapter[];
  [key: string]: unknown;
}

const EMPTY: Attributes = {
  title: '',
  history: '',
  admission_price: null,
  rating: null,
  main_image_url: null,
  chapters: [],
};

function newChapter(n: number): Chapter {
  return {
    chapter_number: n,
    title: '',
    description: '',
    lines: [],
    text: '',
    image_search_query: '',
  };
}

/**
 * AdminJS aplatit `record.params` en clés pointées (`attributes.chapters.0.title`).
 * `flat.get` reconstruit l'objet imbriqué correspondant au chemin.
 */
function readAttributes(
  params: RecordJSON['params'],
  path: string,
): Attributes {
  const value = flat.get(params, path) as unknown;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Attributes;
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      return JSON.parse(value) as Attributes;
    } catch {
      return { ...EMPTY };
    }
  }
  return { ...EMPTY };
}

const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <Box mb="lg">
    <Label>{label}</Label>
    {children}
    {hint ? (
      <Text mt="xs" fontSize="sm" color="grey60">
        {hint}
      </Text>
    ) : null}
  </Box>
);

const AttributesEditor: React.FC<EditPropertyProps> = (props) => {
  const { property, record, onChange } = props;

  const [attributes, setAttributes] = React.useState<Attributes>(() =>
    readAttributes(record?.params ?? {}, property.path),
  );
  const [mode, setMode] = React.useState<'structured' | 'json'>('structured');
  const [rawDraft, setRawDraft] = React.useState(() =>
    JSON.stringify(
      readAttributes(record?.params ?? {}, property.path),
      null,
      2,
    ),
  );
  const [rawError, setRawError] = React.useState<string | null>(null);
  const [openChapters, setOpenChapters] = React.useState<
    Record<number, boolean>
  >({
    0: true,
  });

  /**
   * On ne pousse pas l'objet dans `attributes` : AdminJS ré-aplatirait la valeur
   * et les clés d'un chapitre supprimé pourraient survivre dans le payload. On
   * envoie une chaîne JSON dans un paramètre dédié, que le hook `before` de la
   * ressource reparse côté serveur — le payload reste ainsi déterministe.
   */
  const push = React.useCallback(
    (next: Attributes) => {
      setAttributes(next);
      setRawDraft(JSON.stringify(next, null, 2));
      onChange('attributesJson', JSON.stringify(next));
    },
    [onChange],
  );

  const setField = <K extends keyof Attributes>(key: K, value: Attributes[K]) =>
    push({ ...attributes, [key]: value });

  const chapters = attributes.chapters ?? [];

  const setChapters = (next: Chapter[]) =>
    push({
      ...attributes,
      // Le numéro de chapitre suit toujours la position dans la liste : c'est
      // lui qui pilote l'ordre de lecture côté application mobile.
      chapters: next.map((chapter, index) => ({
        ...chapter,
        chapter_number: index + 1,
      })),
    });

  const setChapter = (index: number, patch: Partial<Chapter>) =>
    setChapters(
      chapters.map((chapter, i) =>
        i === index ? { ...chapter, ...patch } : chapter,
      ),
    );

  const moveChapter = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= chapters.length) return;
    const next = [...chapters];
    [next[index], next[target]] = [next[target], next[index]];
    setChapters(next);
  };

  const applyRaw = (text: string) => {
    setRawDraft(text);
    try {
      const parsed = JSON.parse(text) as Attributes;
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        setRawError('La racine doit être un objet JSON.');
        return;
      }
      setRawError(null);
      setAttributes(parsed);
      onChange('attributesJson', JSON.stringify(parsed));
    } catch (error) {
      setRawError((error as Error).message);
    }
  };

  return (
    <Box
      mb="xl"
      border="default"
      borderRadius="default"
      bg="white"
      style={{ overflow: 'hidden' }}
    >
      <Box
        p="lg"
        bg="grey20"
        borderBottom="default"
        flex
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Box>
          <Text fontWeight="bold">Contenu de l’audioguide</Text>
          <Text fontSize="sm" color="grey60">
            colonne <code>attributes</code> (jsonb) — {chapters.length} chapitre
            {chapters.length > 1 ? 's' : ''}
          </Text>
        </Box>
        <Box flex flexDirection="row" style={{ gap: 8 }}>
          <Button
            type="button"
            size="sm"
            variant="contained"
            color={mode === 'structured' ? 'primary' : 'secondary'}
            onClick={() => setMode('structured')}
          >
            Structuré
          </Button>
          <Button
            type="button"
            size="sm"
            variant="contained"
            color={mode === 'json' ? 'primary' : 'secondary'}
            onClick={() => setMode('json')}
          >
            JSON brut
          </Button>
        </Box>
      </Box>

      <Box p="xl">
        {mode === 'json' ? (
          <Box>
            {rawError ? (
              <MessageBox variant="danger" message="JSON invalide" mb="lg">
                {rawError}
              </MessageBox>
            ) : (
              <MessageBox variant="info" message="Édition libre" mb="lg">
                Les modifications sont reprises dans l’onglet structuré dès que
                le JSON est valide.
              </MessageBox>
            )}
            <TextArea
              width="100%"
              rows={28}
              value={rawDraft}
              onChange={(event: ValueChangeEvent) =>
                applyRaw(event.target.value)
              }
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            />
          </Box>
        ) : (
          <Box>
            <Section>
              <Field label="Titre">
                <Input
                  width="100%"
                  value={attributes.title ?? ''}
                  onChange={(event: ValueChangeEvent) =>
                    setField('title', event.target.value)
                  }
                />
              </Field>

              <Field label="Histoire / introduction">
                <TextArea
                  width="100%"
                  rows={5}
                  value={attributes.history ?? ''}
                  onChange={(event: ValueChangeEvent) =>
                    setField('history', event.target.value)
                  }
                />
              </Field>

              <Box flex flexDirection="row" style={{ gap: 16 }}>
                <Box flexGrow={1}>
                  <Field label="Tarif d’entrée">
                    <Input
                      width="100%"
                      value={attributes.admission_price ?? ''}
                      placeholder="6.50€ — vide = gratuit / inconnu"
                      onChange={(event: ValueChangeEvent) =>
                        setField('admission_price', event.target.value || null)
                      }
                    />
                  </Field>
                </Box>
                <Box flexGrow={1}>
                  <Field label="Note Google">
                    <Input
                      width="100%"
                      type="number"
                      step="0.1"
                      value={attributes.rating ?? ''}
                      onChange={(event: ValueChangeEvent) =>
                        setField(
                          'rating',
                          event.target.value === ''
                            ? null
                            : Number(event.target.value),
                        )
                      }
                    />
                  </Field>
                </Box>
              </Box>

              <Field
                label="Image principale"
                hint="Chemin GCS relatif au bucket, pas une URL. L’API le signe à la lecture."
              >
                <Input
                  width="100%"
                  value={attributes.main_image_url ?? ''}
                  placeholder="ChIJ.../fr/pictures/main.jpg"
                  onChange={(event: ValueChangeEvent) =>
                    setField('main_image_url', event.target.value || null)
                  }
                />
              </Field>
            </Section>

            <Box
              mt="xl"
              mb="lg"
              flex
              flexDirection="row"
              justifyContent="space-between"
            >
              <Text fontWeight="bold">Chapitres</Text>
              <Button
                type="button"
                size="sm"
                variant="contained"
                onClick={() => {
                  setChapters([...chapters, newChapter(chapters.length + 1)]);
                  setOpenChapters((open) => ({
                    ...open,
                    [chapters.length]: true,
                  }));
                }}
              >
                + Ajouter un chapitre
              </Button>
            </Box>

            {chapters.length === 0 ? (
              <MessageBox variant="info" message="Aucun chapitre">
                Ajoute un chapitre, ou génère l’audioguide depuis la page «
                Générer ».
              </MessageBox>
            ) : null}

            {chapters.map((chapter, index) => {
              const isOpen = openChapters[index] ?? false;
              return (
                <Box
                  key={index}
                  mb="lg"
                  border="default"
                  borderRadius="default"
                  style={{ overflow: 'hidden' }}
                >
                  <Box
                    p="lg"
                    bg="grey20"
                    flex
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box
                      flex
                      flexDirection="row"
                      alignItems="center"
                      style={{ gap: 12, cursor: 'pointer' }}
                      onClick={() =>
                        setOpenChapters((open) => ({
                          ...open,
                          [index]: !isOpen,
                        }))
                      }
                    >
                      <Text fontWeight="bold">{isOpen ? '▾' : '▸'}</Text>
                      <Text fontWeight="bold">
                        {index + 1}. {chapter.title || <em>sans titre</em>}
                      </Text>
                      {chapter.audio_url ? (
                        <Text fontSize="sm" color="grey60">
                          🔊
                        </Text>
                      ) : null}
                    </Box>
                    <Box flex flexDirection="row" style={{ gap: 6 }}>
                      <Button
                        type="button"
                        size="icon"
                        variant="contained"
                        color="secondary"
                        disabled={index === 0}
                        onClick={() => moveChapter(index, -1)}
                        title="Monter"
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="contained"
                        color="secondary"
                        disabled={index === chapters.length - 1}
                        onClick={() => moveChapter(index, 1)}
                        title="Descendre"
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="contained"
                        color="danger"
                        onClick={() =>
                          setChapters(chapters.filter((_, i) => i !== index))
                        }
                        title="Supprimer"
                      >
                        ✕
                      </Button>
                    </Box>
                  </Box>

                  {isOpen ? (
                    <Box p="xl">
                      <Field label="Titre">
                        <Input
                          width="100%"
                          value={chapter.title ?? ''}
                          onChange={(event: ValueChangeEvent) =>
                            setChapter(index, { title: event.target.value })
                          }
                        />
                      </Field>

                      <Field label="Description">
                        <TextArea
                          width="100%"
                          rows={2}
                          value={chapter.description ?? ''}
                          onChange={(event: ValueChangeEvent) =>
                            setChapter(index, {
                              description: event.target.value,
                            })
                          }
                        />
                      </Field>

                      <Field label="Texte narré">
                        <TextArea
                          width="100%"
                          rows={6}
                          value={chapter.text ?? ''}
                          onChange={(event: ValueChangeEvent) =>
                            setChapter(index, { text: event.target.value })
                          }
                        />
                      </Field>

                      <Field
                        label="Lignes karaoké"
                        hint="Une ligne par entrée du tableau. Sert au surlignage synchronisé."
                      >
                        <TextArea
                          width="100%"
                          rows={6}
                          value={(chapter.lines ?? []).join('\n')}
                          onChange={(event: ValueChangeEvent) =>
                            setChapter(index, {
                              lines: event.target.value
                                .split('\n')
                                .map((line: string) => line.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </Field>

                      <Box flex flexDirection="row" style={{ gap: 16 }}>
                        <Box flexGrow={1}>
                          <Field
                            label="Audio (chemin GCS)"
                            hint="Régénéré uniquement par l’API. Modifier à la main casse la lecture."
                          >
                            <Input
                              width="100%"
                              value={chapter.audio_url ?? ''}
                              onChange={(event: ValueChangeEvent) =>
                                setChapter(index, {
                                  audio_url: event.target.value || undefined,
                                })
                              }
                            />
                          </Field>
                        </Box>
                        <Box flexGrow={1}>
                          <Field label="Image (chemin GCS)">
                            <Input
                              width="100%"
                              value={chapter.image_url ?? ''}
                              onChange={(event: ValueChangeEvent) =>
                                setChapter(index, {
                                  image_url: event.target.value || undefined,
                                })
                              }
                            />
                          </Field>
                        </Box>
                      </Box>

                      <Field label="Requête de recherche d’image">
                        <Input
                          width="100%"
                          value={chapter.image_search_query ?? ''}
                          onChange={(event: ValueChangeEvent) =>
                            setChapter(index, {
                              image_search_query: event.target.value,
                            })
                          }
                        />
                      </Field>

                      {chapter.transcript !== undefined ? (
                        <Field
                          label="Transcript"
                          hint="Produit par la synthèse vocale, avec les timings de lecture."
                        >
                          <TextArea
                            width="100%"
                            rows={4}
                            value={chapter.transcript ?? ''}
                            onChange={(event: ValueChangeEvent) =>
                              setChapter(index, {
                                transcript: event.target.value,
                              })
                            }
                          />
                        </Field>
                      ) : null}
                    </Box>
                  ) : null}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AttributesEditor;
