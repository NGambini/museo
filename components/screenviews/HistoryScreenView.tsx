import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';

export function HistoryScreenView() {
  return (
    <Box className="flex-1 bg-background-0">
      <Center className="flex-1">
        <VStack space="xs" className="items-center">
          <Heading size="2xl">History</Heading>
          <Text size="md" className="text-typography-500">
            Vos audioguides générés
          </Text>
        </VStack>
      </Center>
    </Box>
  );
}
