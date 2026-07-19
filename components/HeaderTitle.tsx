import React from 'react';
import { Image } from '@/components/ui/image';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';

export interface HeaderTitleProps {
  title: string;
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  return (
    <HStack className="items-center gap-2">
      <Image
        source={require('@/assets/images/icon.png')}
        size="none"
        className="w-16 h-16 rounded-lg"
        alt="Muséo"
      />
      <Heading className="text-primary-500" size="2xl">{title}</Heading>
    </HStack>
  );
}
