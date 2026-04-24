import React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Center } from '@/components/ui/center';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  /** Emplacement logo en haut de l'écran */
  topLogo?: React.ReactNode;
  /** Emplacement logo en bas de l'écran */
  bottomLogo?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Layout commun aux pages d'authentification.
 * Passez vos composants logo via `topLogo` et `bottomLogo`.
 */
export function AuthLayout({
  title,
  subtitle,
  topLogo,
  bottomLogo,
  children,
}: AuthLayoutProps) {
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background-0">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <VStack className="flex-1 px-6 py-10" space="xl">
            {/* Emplacement logo haut */}
            <Center className="mb-2">
              {topLogo ?? (
                <Box className="w-40 h-14 rounded-xl bg-background-100 items-center justify-center">
                  <Text size="xs" className="text-typography-400">
                    Logo
                  </Text>
                </Box>
              )}
            </Center>

            {/* Titre et sous-titre */}
            <VStack space="xs">
              <Heading size="2xl" className="text-typography-900">
                {title}
              </Heading>
              {subtitle ? (
                <Text size="md" className="text-typography-500">
                  {subtitle}
                </Text>
              ) : null}
            </VStack>

            {/* Contenu du formulaire */}
            <VStack className="flex-1" space="md">
              {children}
            </VStack>

            {/* Emplacement logo bas */}
            {bottomLogo ? <Center className="mt-6">{bottomLogo}</Center> : null}
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
