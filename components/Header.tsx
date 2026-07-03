import React from 'react';
import { useRouter } from 'expo-router';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { Menu, MenuItem, MenuItemLabel } from '@/components/ui/menu';
import { User, ChevronDown, Settings, LogOut } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useLogout } from '@/api/auth';
import { queryClient } from '@/lib/queryClient';

export interface HeaderProps {
  title?: string;
}

export function Header({ title = 'Muséo' }: HeaderProps) {
  const router = useRouter();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        queryClient.clear();
        router.replace('/LoginScreen');
      },
    });
  };

  return (
    <HStack className="items-center justify-between px-4 h-16 bg-background-0/90">
      <HStack className="items-center gap-2">
        <Image
          source={require('@/assets/images/icon.png')}
          size="none"
          className="w-16 h-16 rounded-lg"
          alt="Muséo"
        />
        <Heading className="text-primary-500" size="2xl">{title}</Heading>
      </HStack>
      <Menu
        placement="bottom right"
        offset={5}
        trigger={({ ...triggerProps }) => (
          <Pressable className="flex-row items-center p-2 rounded-full" {...triggerProps}>
            <User size={20} color={theme.secondary} />
            <ChevronDown size={12} color={theme.secondary} />
          </Pressable>
        )}
      >
        <MenuItem key="settings" textValue="Settings" onPress={() => router.push('/SettingsScreen')}>
          <Settings size={16} color={theme.secondary} />
          <MenuItemLabel className="ml-2">Settings</MenuItemLabel>
        </MenuItem>
        <MenuItem key="logout" textValue="Déconnecter" onPress={handleLogout}>
          <LogOut size={16} color={theme.secondary} />
          <MenuItemLabel className="ml-2">Déconnecter</MenuItemLabel>
        </MenuItem>
      </Menu>
    </HStack>
  );
}
