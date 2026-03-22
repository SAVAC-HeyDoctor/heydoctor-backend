# Payku — pagos (HeyDoctor)

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `PAYKU_URL` | Base API (sin `/` final), ej. `https://api.payku.cl` o sandbox |
| `PAYKU_TKPRIV` | Bearer en `POST /api/transaction` (servidor) |
| `PAYKU_TKPUB` | Opcional (frontend/SDK si aplica) |
| `PAYKU_URL_RETURN` | URL del frontend tras pago (Payku redirige al usuario) |
| `PAYKU_URL_NOTIFY` | URL completa del webhook. Si se omite: `{API_PUBLIC_URL}/api/payments/webhook` |
| `API_PUBLIC_URL` | Base pública del API (HTTPS), para construir `urlnotify` |

### Webhook (recomendado en producción)

| Variable | Uso |
|----------|-----|
| `PAYKU_WEBHOOK_BEARER` | Token compartido; Payku debe enviar `Authorization: Bearer <token>` (configurar en panel Payku si existe). |
| `PAYKU_WEBHOOK_SECRET` | Si se define, **debe** enviarse cabecera `X-Payku-Signature` o `X-Signature` con HMAC-SHA256 (hex) del JSON del body con claves ordenadas alfabéticamente (`stableStringify`). Ajustar si Payku documenta otro algoritmo. |

Si no configuras ni bearer ni secret, el webhook acepta cualquier llamada (**solo desarrollo**).

## Endpoints

- `POST /api/payments/create` — JWT + `clinicId`. Body: `amount`, `description`, `patientId?`, `consultationId?`.
- `POST /api/payments/webhook` — **Público**; siempre `200 { ok: true }`.
- `GET /api/payments/:id` — JWT; solo el usuario creador en la misma clínica.

## Flujo frontend

1. `POST /api/payments/create` → `{ paymentId, paymentUrl }`.
2. Redirigir al usuario a `paymentUrl`.
3. Tras pagar, Payku redirige a `PAYKU_URL_RETURN`.
4. Consultar estado con `GET /api/payments/:paymentId`.

## Notas

- El cuerpo exacto de Payku (`/api/transaction` y webhook) puede variar por ambiente; el servicio acepta varias claves (`payment_url`, `order`, `status`, etc.).
- Revisa la documentación oficial de Payku para tu país/plan y alinea nombres de campos si hace falta.
