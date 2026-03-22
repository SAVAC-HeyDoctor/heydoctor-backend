# Payku — pagos (HeyDoctor)

## Seguridad del webhook (producción)

- Sin credenciales configuradas → **`401 Unauthorized`** (excepto modo inseguro local, ver abajo).
- **Opción A (preferida):** `PAYKU_WEBHOOK_SECRET` + cabecera `X-Payku-Signature` o `X-Signature` con **HMAC-SHA256** en **hex** del JSON del body con **claves ordenadas alfabéticamente** (mismo criterio que `JSON.stringify` de un objeto con keys ordenadas).
- **Opción B:** `PAYKU_WEBHOOK_BEARER` + `Authorization: Bearer <token>`.
- Si **ambas** variables están definidas, deben cumplirse **las dos**.
- Cuerpo autenticado correctamente → **`200 { ok: true }`**. El procesamiento interno no devuelve 500 a Payku (errores solo en logs + audit).

### Solo desarrollo local

| Variable | Uso |
|----------|-----|
| `PAYKU_WEBHOOK_ALLOW_UNSAFE_LOCAL` | `true` + `NODE_ENV !== 'production'` permite webhook sin secret/bearer (**nunca en prod**). |

## Otras variables

| Variable | Uso |
|----------|-----|
| `PAYKU_URL` | Base API (sin `/` final) |
| `PAYKU_TKPRIV` | Bearer en `POST /api/transaction` |
| `PAYKU_TKPUB` | Opcional |
| `PAYKU_URL_RETURN` | URL del frontend tras pago |
| `PAYKU_URL_NOTIFY` | Webhook completo; si omite: `{API_PUBLIC_URL}/api/payments/webhook` |
| `API_PUBLIC_URL` | Base pública HTTPS del API |
| `PAYMENT_PENDING_EXPIRE_MINUTES` | Tras N minutos en `pending`, `GET /api/payments/:id` puede marcar `expired` (por defecto **1440** = 24 h). |

## Reglas de negocio endurecidas

- **Idempotencia:** si el pago ya está `paid`, el webhook no lo modifica (audit `duplicate`).
- **Monto:** para pasar a `paid`, el webhook debe incluir un monto parseable y **coincidir** con `payment.amount`; si no hay monto o no coincide → `failed` + audit `PAYMENT_STATUS_UPDATED` (`amount_mismatch` / `missing_amount_in_webhook`).
- **Transiciones:** solo desde `pending` → `paid` | `failed` | `cancelled` | `expired`. **`paid` no cambia** a ningún otro estado.
- **Columnas:** `transactionId`, `paidAt`, `rawResponse` (último payload webhook).
- **Auditoría:** acción `payment.status_updated` con `amount`, `statusBefore`, `statusAfter`, `transactionId` en metadata.

## Endpoints

- `POST /api/payments/create` — JWT + `clinicId`.
- `POST /api/payments/webhook` — público; **401** si auth inválida; **200** si ok.
- `GET /api/payments/:id` — JWT; respuesta incluye **`isPaid`** (`status === 'paid'`).

## Flujo frontend

1. `POST /api/payments/create` → `{ paymentId, paymentUrl }`.
2. Redirigir a `paymentUrl`.
3. Payku → `PAYKU_URL_RETURN`.
4. `GET /api/payments/:paymentId` → `status`, `isPaid`, etc.
