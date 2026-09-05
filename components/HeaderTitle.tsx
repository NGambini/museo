import React from 'react';
import { cssInterop } from 'nativewind';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import Logo from '@/assets/images/logo_no_bg.svg';

cssInterop(Logo, {
  className: {
    target: 'style',
    nativeStyleToProp: { height: true, width: true },
  },
});

export interface HeaderTitleProps {
  title: string;
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  return (
    <HStack className="items-center gap-2 mb-2">
      <Logo className="w-16 h-16 rounded-lg" />
      <Heading className="text-primary-500" size="2xl">{title}</Heading>
    </HStack>
  );
}
