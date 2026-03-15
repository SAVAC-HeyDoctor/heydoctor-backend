# Capacidades de AI - HeyDoctor Backend

Integración de AI para asistencia clínica, búsqueda médica e insights operacionales.

## Stack

- Strapi, PostgreSQL, Redis, BullMQ, EventBus, Meilisearch, ClickHouse
- Multi-tenant basado en `clinic`
- AI opcional (OpenAI compatible)

---

## 1. Configuración

| Variable | Descripción |
|----------|-------------|
| `AI_PROVIDER` | Proveedor (ej: `openai`). Sin definir = AI desactivado |
| `AI_API_KEY` | API key del proveedor |
| `AI_BASE_URL` | URL base (default: `https://api.openai.com/v1`) |

Si `AI_PROVIDER` no está definido, todas las funciones AI se desactivan automáticamente.

---

## 2. AI Clinical Assistant

**Módulo:** `modules/ai`

### Función: `generateConsultationSummary()`

**Entrada (anonimizada):**
- `transcript`: transcripción de la consulta
- `messages`: mensajes del chat
- `clinicalNotes`: notas del registro clínico

**Salida:**
```json
{
  "summary": "Resumen breve de la consulta",
  "symptoms": ["síntoma1", "síntoma2"],
  "possible_diagnoses": ["diagnóstico 1", "diagnóstico 2"],
  "recommended_tests": ["prueba 1", "prueba 2"]
}
```

### Integración

- Se ejecuta cuando termina una consulta (`consultation_ended`)
- Se encola como job en BullMQ (`ai-consultation-summary`)
- El worker obtiene transcript, messages y clinicalNotes desde Strapi y llama a la AI

---

## 3. AI Medical Search

**Módulo:** `modules/search`

### Función: `aiMedicalSearch(query)`

Cuando AI está disponible y el tipo de búsqueda es `diagnostic`:

- Usa AI para interpretar la consulta médica
- Sugiere diagnósticos o condiciones CIE10 relacionados

**Ejemplo:**

| Input | Output |
|-------|--------|
| "dolor de cabeza persistente y visión borrosa" | `["Migraine", "Hypertension", "Intracranial pressure"]` |

### Integración

- Extiende `GET /api/search?q=...&type=diagnostic`
- La respuesta incluye `meta.ai_suggestions` cuando AI está disponible
- Fallback: si AI no está disponible → búsqueda Meilisearch/SQL normal

---

## 4. AI Operational Insights

**Módulo:** `modules/analytics/ai-insights`

### Función: `generateWeeklyInsights()`

Analiza eventos de ClickHouse:

- `consultation_started`
- `appointment_created`
- `appointment_cancelled`
- `search_performed`

Genera métricas automáticas:

- Consultas por clínica
- Tasa de cancelación
- Crecimiento de pacientes
- Uso de telemedicina

**Salida:**
```json
{
  "clinic_id": 1,
  "insights": ["insight 1", "insight 2", ...],
  "metrics": {
    "consultations": 45,
    "created": 60,
    "cancelled": 8,
    "searches": 120,
    "cancelRate": "13.3"
  }
}
```

### Ejecución

- Job BullMQ `ai-weekly-insights`
- Programado semanalmente (lunes 9:00 AM, cron: `0 9 * * 1`)

---

## 5. Seguridad

**Nunca enviar datos sensibles a AI:**

- Eliminar nombres (paciente, doctor)
- Eliminar emails
- Eliminar documentos médicos completos
- Eliminar identificadores (IDs, fechas de nacimiento)

Solo se envía texto clínico anonimizado mediante `modules/ai/anonymize.js`:

- `anonymizeText()`: reemplaza emails, IDs, fechas, nombres
- `anonymizeTranscript()`, `anonymizeMessages()`, `anonymizeClinicalNotes()`
