import type { ReactNode } from 'react';
import { Button, Card, CardBody } from '@ai27-tech/ui';

import type { EstadoConsultaTipo } from './estadoConsulta';
import { TEXTOS_ADMINISTRACION as TEXTOS } from './mensajes';

interface RegionConsultaProps {
  readonly estado: EstadoConsultaTipo;
  /** Nombre de la región, para lectores de pantalla. */
  readonly etiqueta: string;
  readonly textoBrecha?: string;
  readonly textoVacio?: string;
  /** Reintento manual del estado `error`. */
  readonly onReintentar?: () => void;
  /** Contenido con datos. Se muestra en `datos` y, atenuado, en `datos_desactualizado`. */
  readonly children?: ReactNode;
}

/** Región de una consulta con sus estados: brecha, cargando, vacío, error, sin acceso y datos. */
export function RegionConsulta({
  estado,
  etiqueta,
  textoBrecha,
  textoVacio,
  onReintentar,
  children,
}: RegionConsultaProps) {
  switch (estado) {
    case 'brecha':
      return (
        <Card variant="outlined" aria-label={etiqueta}>
          <CardBody>
            <p role="status">{textoBrecha ?? TEXTOS.seccionNoPublicada}</p>
          </CardBody>
        </Card>
      );

    case 'cargando':
      return (
        <p role="status" aria-busy="true">
          {TEXTOS.cargando}
        </p>
      );

    case 'vacio':
      return <p role="status">{textoVacio ?? TEXTOS.vacio}</p>;

    case 'error':
      return (
        <div role="alert" className="flex flex-col gap-2">
          <p>{TEXTOS.errorConsulta}</p>
          {onReintentar && (
            <Button variant="outline" size="sm" onClick={onReintentar}>
              {TEXTOS.reintentar}
            </Button>
          )}
        </div>
      );

    case 'sin_acceso':
      return <p role="alert">{TEXTOS.sinAccesoConsulta}</p>;

    case 'datos_desactualizado':
      return (
        <div className="flex flex-col gap-2">
          <p role="alert">{TEXTOS.datosDesactualizados}</p>
          <div className="opacity-60" data-region={etiqueta}>
            {children}
          </div>
        </div>
      );

    case 'datos':
      return <>{children}</>;
  }
}
