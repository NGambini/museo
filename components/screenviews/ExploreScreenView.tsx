import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';

export function ExploreScreenView() {
  return (
    <Box className="flex-1 bg-background-0">
      <Center className="flex-1">
        <VStack space="xs" className="items-center">
          <Heading size="2xl">Explore</Heading>
          <Text size="md" className="text-typography-500">
            Rechercher un lieu ou explorer la carte
          </Text>
        </VStack>
      </Center>
    </Box>
  );
}
