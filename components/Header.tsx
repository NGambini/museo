import React from 'react';
import { useRouter } from 'expo-router';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Menu, MenuItem, MenuItemLabel } from '@/components/ui/menu';
import { User, ChevronDown, ChevronLeft, Settings } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { HeaderTitle } from '@/components/HeaderTitle';

export interface HeaderProps {
  title?: string;
  isHome?: boolean;
}

export function Header({ title = 'Muséo', isHome = false }: HeaderProps) {
  const router = useRouter();

  return (
    <HStack
      className="items-center justify-between px-4 h-16 bg-background-0/90 shadow-soft-1"
      style={{ shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 2 }}
    >
      {isHome ? (
        <HStack className="items-center gap-2"><HeaderTitle title={title} /></HStack>
      ) : (
        <>
          <Pressable onPress={() => router.back()}>
            <ChevronLeft size={24} color={theme.secondary} />
          </Pressable>
          <HStack
            pointerEvents="none"
            className="items-center gap-2 absolute left-0 right-0 justify-center"
          >
            <HeaderTitle title={title} />
          </HStack>
        </>
      )}

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
      </Menu>
    </HStack>
  );
}
