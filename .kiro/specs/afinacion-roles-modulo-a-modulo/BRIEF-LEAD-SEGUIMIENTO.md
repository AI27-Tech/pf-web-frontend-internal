# Seguimiento: roles del panel interno

Para: Fabricio Fuentes (Lead) · De: Angel Arredondo · Fecha: [fecha]

Gracias por las decisiones. Con ellas el panel ya sigue la tabla. Queda una pregunta y dos supuestos.

## Pregunta

**Escritura de Catálogos del Coordinador.** La decisión 10 dice que el Administrador y el Coordinador leen y escriben Catálogos. DEC-142 #6 dice que crear o modificar vehículos y custodios es solo del Administrador. Entiendo que la decisión 10 aplica a los valores de catálogo (E8-T16) y que vehículos y custodios siguen solo del Administrador. ¿Es correcto, o el Coordinador también escribe vehículos y custodios?

## Supuestos que voy a aplicar

Respóndeme solo si alguno no es correcto.

1. **Fecha y hora del viaje (`completarFechaHora`).** Dijiste "el Monitorista no". Aplico lo mismo a Supervisor y Coordinador, que heredan del Monitorista. Solo Jefe Operativo y Administrador la corrigen.
2. **Subir adjunto.** El backend ya devuelve `403`, pero el contrato no nombra los roles. Aplico Monitorista, Supervisor, Coordinador y Administrador, igual que ver y descargar el expediente (DEC-149 #8).
