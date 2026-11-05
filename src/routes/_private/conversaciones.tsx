import { createFileRoute } from '@tanstack/react-router';
import { BandejaConversaciones } from '@/features/conversaciones/BandejaConversaciones';

export const Route = createFileRoute('/_private/conversaciones')({
  validateSearch: (search: Record<string, unknown>): { conversacion?: string } => {
    const value = typeof search.conversacion === 'string' ? search.conversacion : undefined;
    return value === undefined ? {} : { conversacion: value };
  },
  component: BandejaConversaciones,
});
