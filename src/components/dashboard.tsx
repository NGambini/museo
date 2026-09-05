import React from 'react';
import { ApiClient } from 'adminjs';
import {
  Box,
  H3,
  H5,
  Link,
  Loader,
  MessageBox,
  Text,
} from '@adminjs/design-system';

interface DashboardData {
  total: number;
  byLang: Array<{ lang: string; count: number }>;
  generatedToday: number;
  dailyCap: number;
  recent: Array<{
    id: string;
    placeName: string;
    lang: string;
    createdAt: string;
    chapters: number;
  }>;
}

const api = new ApiClient();

function rootPath(): string {
  const [prefix] = window.location.pathname.split(/\/(pages|resources)\//);
  return prefix || '/admin';
}

const Stat: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
}> = ({ label, value, hint }) => (
  <Box variant="white" flexGrow={1} style={{ minWidth: 180 }}>
    <Text fontSize="sm" color="grey60">
      {label}
    </Text>
    <Text fontSize="h2" fontWeight="bold" lineHeight="default">
      {value}
    </Text>
    {hint ? (
      <Text fontSize="sm" color="grey60">
        {hint}
      </Text>
    ) : null}
  </Box>
);

const Dashboard: React.FC = () => {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api
      .getDashboard()
      .then((response) => setData(response.data as DashboardData))
      .catch((caught: Error) => setError(caught.message));
  }, []);

  if (error) {
    return (
      <Box variant="grey">
        <MessageBox variant="danger" message="Statistiques indisponibles">
          {error}
        </MessageBox>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box variant="grey" flex justifyContent="center" p="xxl">
        <Loader />
      </Box>
    );
  }

  return (
    <Box variant="grey">
      <Box variant="white" mb="xl">
        <H3>Catalogue audioguide</H3>
        <Text color="grey60">
          Les audioguides forment un catalogue partagé : un lieu généré une fois
          sert à tous les comptes.
        </Text>
      </Box>

      <Box
        flex
        flexDirection="row"
        mb="xl"
        style={{ gap: 16, flexWrap: 'wrap' }}
      >
        <Stat label="Audioguides" value={data.total} />
        <Stat
          label="Générés aujourd’hui"
          value={`${data.generatedToday} / ${data.dailyCap}`}
          hint="plafond global de l’API, remis à zéro à minuit UTC"
        />
        <Stat
          label="Langues"
          value={data.byLang.length}
          hint={data.byLang
            .map((row) => `${row.lang} (${row.count})`)
            .join(' · ')}
        />
      </Box>

      <Box variant="white">
        <H5 mb="lg">Derniers ajouts</H5>
        {data.recent.length === 0 ? (
          <Text color="grey60">
            Aucun audioguide. Commence par la page « Générer un audioguide ».
          </Text>
        ) : (
          data.recent.map((audioguide) => (
            <Box
              key={audioguide.id}
              py="default"
              borderBottom="default"
              flex
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Link
                  href={`${rootPath()}/resources/Audioguide/records/${audioguide.id}/show`}
                >
                  {audioguide.placeName}
                </Link>
                <Text fontSize="sm" color="grey60">
                  {audioguide.lang} · {audioguide.chapters} chapitre
                  {audioguide.chapters > 1 ? 's' : ''}
                </Text>
              </Box>
              <Text fontSize="sm" color="grey60">
                {new Date(audioguide.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default Dashboard;
