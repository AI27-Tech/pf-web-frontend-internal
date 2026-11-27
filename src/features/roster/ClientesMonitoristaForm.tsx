/*
 * Edición de "mis clientes" de un Monitorista (DEC-149 #18, M11).
 *
 * Solo se ofrecen clientes activos; un cliente puede estar en varios Monitoristas. Los clientes
 * se agregan desde un selector buscable y se quitan con su botón. Un cliente ya asignado que
 * dejó de estar activo se muestra marcado "Desactivado" y se quita al guardar: el servidor
 * respondería 400 si se reenviara. Guardar envía el conjunto completo de activos, una sola vez.
 */
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Form,
  FormActions,
  FormField,
  FormSection,
  Inline,
  Select,
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

const TEXTO_TENUE = 'var(--ui-color-text-muted)';

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

  const nombreDe = (id: string) => activos.find((c) => c.id === id)?.nombre ?? id;

  const sinCambios =
    elegidos.length === asignadosActivos.length &&
    elegidos.every((id) => asignadosActivos.includes(id));
  // Guardar con desactivados es un cambio: los quita del conjunto.
  const sinNada = sinCambios && desactivados.length === 0;
  const bloqueado = enviando || sinNada;

  // Solo se ofrecen los activos que aún no están elegidos.
  const opciones = activos
    .filter((c) => !elegidos.includes(c.id))
    .map((c) => ({ value: c.id, label: c.nombre }));

  const agregar = (id: string) => {
    if (enviando || id === '' || elegidos.includes(id)) return;
    setElegidos((actual) => [...actual, id]);
  };

  const quitar = (id: string) => {
    if (enviando) return;
    setElegidos((actual) => actual.filter((c) => c !== id));
  };

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
      <FormSection
        title="Clientes"
        description="Un cliente puede estar en varios Monitoristas. El Monitorista ve los viajes de sus clientes desde APROBADO."
      >
        <Stack gap={2}>
          <FormField label="Agregar cliente">
            <Select
              variant="searchable"
              placeholder="Busca un cliente"
              searchPlaceholder="Buscar por nombre"
              noResultsText="Ningún cliente coincide"
              value=""
              disabled={enviando}
              options={opciones}
              onChange={(valor) => agregar(String(valor))}
            />
          </FormField>

          {elegidos.length === 0 && desactivados.length === 0 ? (
            <span className="ui-text-body-xs" style={{ color: TEXTO_TENUE }}>
              Ningún cliente asignado.
            </span>
          ) : (
            <Inline gap={2} wrap role="group" aria-label="Clientes asignados">
              {elegidos.map((id) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant="primary"
                  endIcon={<X size={14} aria-hidden="true" />}
                  aria-label={`Quitar a ${nombreDe(id)}`}
                  disabled={enviando}
                  onClick={() => quitar(id)}
                >
                  {nombreDe(id)}
                </Button>
              ))}
              {desactivados.map((id) => (
                <Badge key={id} variant="neutral">
                  {`${id} · Desactivado`}
                </Badge>
              ))}
            </Inline>
          )}

          {desactivados.length > 0 && (
            <Alert variant="warning">
              Los clientes desactivados se quitan al guardar. No se pueden volver a asignar.
            </Alert>
          )}
        </Stack>
      </FormSection>

      {error && <Alert variant="danger">{error}</Alert>}

      {sinNada && !enviando && (
        <p className="ui-text-body-xs" style={{ margin: 0, color: TEXTO_TENUE }}>
          No hay cambios por guardar.
        </p>
      )}

      <FormActions align="end" sticky>
        <Button variant="secondary" type="button" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={bloqueado} loading={enviando}>
          Guardar clientes
        </Button>
      </FormActions>
    </Stack>
  );
}
