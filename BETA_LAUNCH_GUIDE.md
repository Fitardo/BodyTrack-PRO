# BODYTRACK PRO — MANUAL OPERATIVO DE LANZAMIENTO BETA PRIVADA (v2.4)

Este documento reúne los artefactos operativos requeridos para ejecutar y supervisar la **Beta Privada de BodyTrack Pro** con un grupo cerrado de 10 a 15 usuarios reales enfocados en recomposición corporal (nutrición + entrenamiento de fuerza).

---

## 1. Lista de Verificación Previa al Lanzamiento (Pre-Flight Checklist)

- [x] **Autenticación y Control de Acceso:** Registro bloqueado por defecto; validación obligatoria de código de invitación en backend (`/api/auth/register`).
- [x] **Separación de Roles (`admin` vs `user`):** Middleware `requireAdmin` activo en todas las rutas `/api/admin/*`.
- [x] **Aislamiento Multi-Tenant (`StorageService`):** Todas las claves de `localStorage` están prefijadas por usuario (`bt_${userId}_${entity}`) impidiendo lecturas cruzadas en dispositivos compartidos.
- [x] **Privacidad Fotográfica:** Las fotos de progreso físico se almacenan exclusivamente en el navegador local del usuario y están desmarcadas por defecto en el Onboarding.
- [x] **Cumplimiento RGPD (Exportación y Purgado):** Botones de descarga completa en JSON y eliminación irreversible ("Derecho al Olvido") operativos en la vista de Perfil.
- [x] **Sanitización de Analítica:** Filtro automático (`FORBIDDEN_WORDS`) que bloquea el envío de peso, cintura, % graso, comidas, fotos o credenciales al servidor de telemetría.
- [x] **Compatibilidad Cloud Run (Node 22 ESM):** `server.ts` autocontenido sin importaciones relativas sin extensión ni tipos en tiempo de ejecución.

---

## 2. Guía Breve para Participantes de la Beta

### ¡Bienvenido a la Beta Privada de BodyTrack Pro!
Gracias por ayudarnos a validar **BodyTrack Pro**. Durante las próximas 4 semanas evaluarás nuestro sistema integral de recomposición corporal.

1. **Cómo acceder:**
   - Haz clic en **"Acceso Beta"** en la esquina superior derecha.
   - Selecciona **"Tengo Invitación"** e introduce tu código personal (por ejemplo, `BETA-PRO-2026`).
2. **Configuración inicial (Onboarding):**
   - Completa el asistente de 5 pasos (menos de 90 segundos). Ninguna métrica secundaria ni fotografía es obligatoria.
3. **Flujo recomendado durante la Beta:**
   - **Diario:** Registra tu peso en ayunas (Acción rápida `+`) y tus comidas (o impórtalas en lote mediante archivo CSV desde Fitia o MyFitnessPal en la pestaña *Nutrición*).
   - **Días de entrenamiento:** Registra tus series, cargas y RIR en la pestaña *Entrenamiento*.
   - **Semanal (Domingos):** Visita *Revisión Semanal* para comparar la media móvil exponencial (EMA 7d) y aplicar ajustes calóricos basados en evidencia.
4. **Cómo enviar Feedback o reportar errores:**
   - Pulsa el botón **"Feedback Beta"** en la barra superior en cualquier momento. Recibirás un código de seguimiento único (ej. `FB-2026-X89K`).

---

## 3. Cuestionario Estructurado de Feedback (Semana 2 y Semana 4)

1. **Activación y Onboarding:** ¿Qué tan claro fue configurar tus calorías y objetivos el primer día? (Escala 1–5)
2. **Fricción de Registro Nutricional:** ¿Cuánto tiempo te toma registrar un día completo de comidas o importar tu CSV de Fitia/MyFitnessPal?
3. **Registro en el Gimnasio:** Durante tus descansos entre series, ¿resulta cómodo introducir peso, repeticiones y RIR desde el móvil?
4. **Confianza y Privacidad:** ¿Te sientes seguro respecto a cómo se almacenan tus datos corporales y fotografías?
5. **Valor Diferencial:** ¿Qué módulo eliminarías sin extrañarlo y cuál consideras imprescindible para renovar su uso el próximo mes?

---

## 4. Procedimiento Operativo ante Incidencias (SOP)

| Severidad | Definición | Tiempo de Respuesta | Acción Inmediata |
| :--- | :--- | :--- | :--- |
| **P0 — Crítica** | Fallo de inicio de sesión, caída del contenedor Cloud Run o riesgo de privacidad. | < 2 horas | Revocar sesiones activas si hay compromiso, pausar invitaciones (`Revocar` en Panel Admin) y desplegar hotfix. |
| **P1 — Alta** | Error en cálculo de macros/EMA o fallo en importación CSV de un formato específico. | < 12 horas | Reproducir con archivo CSV anonimizado y publicar parche con test unitario en `csvImport.test.ts`. |
| **P2 — Media/Baja** | Fricción visual, mejora de UX o sugerencia de nuevo ejercicio en catálogo. | Revisión semanal | Clasificar ticket como `in_review` en el Panel Admin y agrupar en el sprint semanal. |

---

## 5. Registro de Decisiones de Producto (Product Decisions Log)

1. **Arquitectura Híbrida Zero-Knowledge para Datos Biométricos:**
   - *Decisión:* El servidor gestiona identidad, invitaciones, sesiones, feedback y analítica agregada en `.data/beta-store.json`, mientras que los datos sensibles (pesajes, perímetros, comidas y fotografías en Base64) permanecen en el almacenamiento local aislado por tenant (`bt_${userId}_*`).
   - *Justificación:* Minimiza radicalmente el impacto legal y de privacidad durante la beta privada (cero fotos corporales viajando por red o almacenadas en servidores centrales) y mantiene coste $0 de almacenamiento en nube.
2. **Importación CSV Resiliente frente a Integración API Directa:**
   - *Decisión:* Priorizar el motor de importación CSV/JSON compatible con Fitia y MyFitnessPal con detección automática de delimitadores y deduplicación por huella.
   - *Justificación:* Evita bloqueos por aprobaciones comerciales de APIs cerradas de terceros y permite migrar meses de historial en menos de 5 segundos.
3. **Fotografías 100% Opt-In:**
   - *Decisión:* El módulo de fotografías viene desmarcado por defecto en el Onboarding y nunca se exige para calcular tendencias ni revisiones semanales.
   - *Justificación:* Reduce el abandono temprano en usuarios que desean privacidad física total.

---

## 6. Estrategia de Respaldo y Exportación

- **Nivel Usuario (Autogestión RGPD):** Cada usuario puede descargar en cualquier instante una copia completa de su espacio aislado en formato JSON estructurado desde **Perfil → Exportar Todos Mis Datos (JSON)**, además de los reportes tabulares CSV desde el módulo **Informes**.
- **Nivel Servidor (Operación Beta):** El estado de cuentas, invitaciones y tickets de feedback se persiste atómicamente en `.data/beta-store.json`. En despliegues Cloud Run con escalado a cero, se recomienda exportar semanalmente los tickets y métricas desde el Panel de Administración o montar un volumen Cloud Storage FUSE en `/workspace/.data` para persistencia inmutable entre revisiones del contenedor.
