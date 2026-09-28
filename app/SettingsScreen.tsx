import React, { useState } from 'react';
import { useColorScheme } from 'nativewind';
import { SettingsScreenView } from '@/components/screenviews/SettingsScreenView';

export default function SettingsScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();

  const [darkTheme, setDarkTheme] = useState(colorScheme === 'dark');

  const handleToggleTheme = () => {
    const nextMode = !darkTheme;
    setDarkTheme(nextMode);
    setColorScheme(nextMode ? 'dark' : 'light');
  };

  return <SettingsScreenView darkTheme={darkTheme} onToggleDarkTheme={handleToggleTheme} />;
}
