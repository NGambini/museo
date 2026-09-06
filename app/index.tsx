import { Redirect } from 'expo-router';

// Plus de login : l'app démarre directement sur le HomeScreen.
export default function Index() {
  return <Redirect href="/HomeScreen" />;
}
