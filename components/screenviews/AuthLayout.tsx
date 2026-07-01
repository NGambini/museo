import React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthLayout({
  title,
  subtitle,
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
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
