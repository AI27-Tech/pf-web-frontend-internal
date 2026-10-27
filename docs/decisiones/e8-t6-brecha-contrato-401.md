# Brecha de contrato — `401` sin causa distinguible

**Identificador:** BRECHA-CONTRATO-1
**Origen:** E8-T6 — corte de sesión no recuperable en los portales
**Estado:** abierta, fuera del alcance de implementación frontend
**Destino:** `pf-pkg-contracts` / `bff`

## Situación

El `401` de una petición protegida no distingue entre un token expirado y una sesión revocada. El contrato actual define ambas situaciones con la misma respuesta de autorización y no publica un `codigo` estable que permita al portal identificar la causa.

El portal no debe inferir ni inventar la causa. E8-T6 resuelve el comportamiento ramificando sobre la recuperabilidad: intenta un refresh cuando hay `refreshToken`; si el refresh falla con `401` o no existe token utilizable, ejecuta el corte y muestra el mensaje neutral:

> Tu sesión finalizó. Inicia sesión de nuevo para continuar.

## Impacto

No bloquea E8-T6. Limita únicamente la posibilidad de mostrar un mensaje específico para revocación o expiración.

## Propuesta futura

Si Producto y Arquitectura necesitan distinguir ambas causas, el `bff` podría publicar un `codigo` estable, por ejemplo `sesion_revocada`, manteniendo compatibilidad con la respuesta de autorización y documentando su semántica en el contrato.

Esa evolución requiere revisar `bff`, `identidad`, el contrato y los consumidores. No se implementa en los portales como parte de E8-T6.
