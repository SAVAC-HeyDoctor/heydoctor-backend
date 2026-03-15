# AI Clinical Copilot - HeyDoctor

Asistencia en tiempo real para el médico durante consultas activas.

## Requisitos

- `AI_PROVIDER` y `AI_API_KEY` configurados
- `REDIS_URL` para cache y jobs BullMQ

## Módulo

`modules/ai/copilot`

### Funciones

#### `analyzeConsultationContext({ messages, clinicalNotes, patientHistory })`

Analiza y anonimiza el contexto de la consulta antes de enviarlo a AI.

**Entrada:**
- `messages`: array de mensajes del chat
- `clinicalNotes`: notas del registro clínico actual
- `patientHistory`: historia del paciente (clinical_record)

**Salida:** objeto con texto anonimizado para cada sección.

#### `generateSuggestions({ messages, clinicalNotes, patientHistory })`

Genera sugerencias clínicas usando AI.

**Salida:**
```json
{
  "symptoms_detected": ["síntoma 1", "síntoma 2"],
  "possible_diagnoses": ["diagnóstico posible 1", "diagnóstico posible 2"],
  "suggested_questions": ["pregunta sugerida 1", "pregunta sugerida 2"],
  "suggested_tests": ["prueba sugerida 1", "prueba sugerida 2"]
}
```

## Integración con consultas activas

### Eventos

| Evento | Descripción |
|-------|-------------|
| `CONSULTATION_STARTED` | Consulta iniciada → encola análisis inmediato |
| `MESSAGE_CREATED` | Nuevo mensaje en el chat → encola análisis inmediato |

### Análisis periódico

- Job BullMQ `ai-copilot` con dos tipos:
  - **scheduler**: se ejecuta cada 30 segundos, obtiene consultas `in_progress` y encola análisis
  - **analyze**: procesa una consulta, genera sugerencias y las guarda en Redis

### Cache

- Sugerencias en Redis: `copilot:suggestions:{consultationId}`
- TTL: 2 minutos (se refresca cada 30s durante la consulta)

## API

### GET /api/copilot/suggestions

Obtiene sugerencias para una consulta activa.

**Query:**
- `consultationId` (requerido): ID de la consulta/appointment

**Respuesta (sugerencias disponibles):**
```json
{
  "data": {
    "symptoms_detected": [],
    "possible_diagnoses": [],
    "suggested_questions": [],
    "suggested_tests": []
  },
  "meta": { "ai_enabled": true, "status": "ready" }
}
```

**Respuesta (análisis en curso):**
```json
{
  "data": null,
  "meta": {
    "ai_enabled": true,
    "status": "processing",
    "message": "Análisis en curso, intente de nuevo en unos segundos"
  }
}
```

**Permisos:** Usuario autenticado con `tenant-resolver` (clínica requerida). El médico debe tener acceso a la consulta.

## Seguridad

- Todo el texto se anonimiza antes de enviarlo a AI (`modules/ai/anonymize.js`)
- Se eliminan nombres, emails, IDs y fechas sensibles
- Solo se envía contenido clínico anonimizado

## Flujo del frontend

1. El médico inicia una consulta → `CONSULTATION_STARTED` → análisis encolado
2. Cada 30s el scheduler encola análisis para consultas activas
3. El frontend hace polling a `GET /api/copilot/suggestions?consultationId=X`
4. Si hay cache → devuelve sugerencias
5. Si no hay cache → devuelve `status: "processing"` y el frontend reintenta en unos segundos
