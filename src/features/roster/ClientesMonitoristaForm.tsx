/*
 * Edición de "mis clientes" de un Monitorista (DEC-149 #18, M11).
 *
 * Solo se ofrecen clientes activos; un cliente puede estar en varios Monitoristas. Un cliente
 * ya asignado que dejó de estar activo se muestra marcado "desactivado" y no se reenvía: el
 * servidor respondería 400. Guardar envía el conjunto completo de activos, una sola vez.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Form,
  FormActions,
  FormSection,
  Inline,
  Stack,
} from '@ai27-tech/ui';
import type { Cliente } from '@/lib/contracts/clientes';

export interface ClientesMonitoristaFormProps {
  /** Clientes asignados hoy al Monitorista (pueden incluir desactivados). */
  readonly actuales: readonly string[];
  /** Clientes activos que ofrece el BFF. */
  readonly clientes: readonly Cliente[];
  readonly enviando: boolean;
  readonly error: string | null;
  readonly onGuardar: (clientesIds: readonly string[]) => void;
  readonly onCancelar: () => void;
}

export function ClientesMonitoristaForm({
  actuales,
  clientes,
  enviando,
  error,
  onGuardar,
  onCancelar,
}: ClientesMonitoristaFormProps) {
  const activos = clientes.filter((c) => c.estado === 'activo');
  const idsActivos = new Set(activos.map((c) => c.id));
  const desactivados = actuales.filter((id) => !idsActivos.has(id));
  const asignadosActivos = actuales.filter((id) => idsActivos.has(id));

  const [elegidos, setElegidos] = useState<readonly string[]>(asignadosActivos);
  // Envío único: el doble clic llega antes de que `enviando` deshabilite el botón.
  const enviado = useRef(false);
  useEffect(() => {
    if (!enviando) enviado.current = false;
  }, [enviando]);

  const sinCambios =
    elegidos.length === asignadosActivos.length &&
    elegidos.every((id) => asignadosActivos.includes(id));
  // Guardar con desactivados es un cambio: los quita del conjunto.
  const bloqueado = enviando || (sinCambios && desactivados.length === 0);

  const alternar = (id: string, marcado: boolean) =>
    setElegidos((actual) => (marcado ? [...actual, id] : actual.filter((c) => c !== id)));

  const enviar = () => {
    if (bloqueado || enviado.current) return;
    enviado.current = true;
    // Orden estable del catálogo; nunca se reenvía un cliente desactivado.
    onGuardar(activos.map((c) => c.id).filter((id) => elegidos.includes(id)));
  };

  return (
    <Stack
      as={Form}
      gap={3}
      onSubmit={(event) => {
        event.preventDefault();
        enviar();
      }}
    >
      <FormSection title="Clientes activos">
        {activos.length === 0 ? (
          <EmptyState size="sm" title="No hay clientes activos." />
        ) : (
          <Stack gap={1}>
            {activos.map((c) => (
              <Checkbox
                key={c.id}
                label={c.nombre}
                checked={elegidos.includes(c.id)}
                disabled={enviando}
                onChange={(event) => alternar(c.id, event.target.checked)}
              />
            ))}
          </Stack>
        )}
      </FormSection>
      {desactivados.length > 0 && (
        <Alert variant="warning">
          <Stack gap={1}>
            <span>
              Estos clientes están desactivados y se quitarán al guardar: no se pueden volver a
              asignar.
            </span>
            <Inline as="ul" gap={2} wrap style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {desactivados.map((id) => (
                <Inline as="li" key={id} gap={1} align="center" wrap={false}>
                  <span>{id}</span>
                  <Badge variant="neutral">Desactivado</Badge>
                </Inline>
              ))}
            </Inline>
          </Stack>
        </Alert>
      )}
      {error && <Alert variant="danger">{error}</Alert>}
      <FormActions align="end">
        <Button variant="secondary" type="button" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={bloqueado}>
          {enviando ? 'Guardando...' : 'Guardar clientes'}
        </Button>
      </FormActions>
    </Stack>
  );
}
