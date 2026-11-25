/*
 * Modal de configuración de la cuenta: datos del usuario, tema visual y cierre
 * de sesión. Se abre desde el grupo "Cuenta" de la barra lateral.
 *
 * Usa SOLO componentes de @ai27-tech/ui.
 */

import { useState } from 'react';
import { Button, DescriptionList, Inline, Modal, Radio, Section, Stack } from '@ai27-tech/ui';

import type { Usuario } from '@/lib/contracts';
import { cambiarTema, leerTema, type Tema } from '@/lib/tema';
import { rolLabels } from './navigationConfig';

interface ConfiguracionModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly usuario: Usuario;
  /** Cierra la sesión. El modal se cierra antes de invocarla. */
  readonly onLogout: () => void;
}

/** Opciones de tema en el orden en que se muestran. */
const OPCIONES_TEMA: readonly { readonly valor: Tema; readonly etiqueta: string }[] = [
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
];

export function ConfiguracionModal({ open, onClose, usuario, onLogout }: ConfiguracionModalProps) {
  const [tema, setTema] = useState<Tema>(leerTema);

  const seleccionarTema = (nuevo: Tema) => {
    setTema(nuevo);
    cambiarTema(nuevo);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configuración"
      size="sm"
      footer={
        <Inline gap={2} justify="end" wrap={false}>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onClose();
              onLogout();
            }}
          >
            Cerrar sesión
          </Button>
        </Inline>
      }
    >
      <Stack gap={5}>
        <Section title="Usuario">
          <DescriptionList
            columns={1}
            items={[
              { label: 'Identificador', value: usuario.id },
              { label: 'Rol', value: rolLabels[usuario.rol] },
            ]}
          />
        </Section>

        <Section title="Tema" description="Se recuerda en este navegador.">
          <Stack gap={2}>
            {OPCIONES_TEMA.map((opcion) => (
              <Radio
                key={opcion.valor}
                name="tema"
                value={opcion.valor}
                label={opcion.etiqueta}
                checked={tema === opcion.valor}
                onChange={() => seleccionarTema(opcion.valor)}
              />
            ))}
          </Stack>
        </Section>
      </Stack>
    </Modal>
  );
}
