# Medical AI Engine - HeyDoctor

Motor de aprendizaje continuo basado en datos clínicos agregados. Evoluciona el Medical Knowledge Graph hacia predicciones probabilísticas.

## Requisitos

- Strapi, PostgreSQL, ClickHouse, Redis
- Medical Knowledge Graph (medical_graph_edges)
- Multi-tenant basado en `clinic`

## Arquitectura

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Knowledge Graph     │     │  Medical AI Engine     │     │  Consumidores        │
│  medical_graph_edges │────▶│  P(d|s), P(t|d)        │────▶│  AI Copilot          │
│  (ClickHouse)       │     │  predictFromSymptoms   │     │  Clinical Intelligence│
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
         ▲                              │
         │                              │
┌────────┴────────┐            ┌────────┴────────┐
│ clinical_record │            │  ai-model-refresh│
│ diagnostic      │            │  (BullMQ daily)  │
│ treatment       │            └─────────────────┘
└─────────────────┘
```

## Fuentes de datos

| Fuente | Uso |
|--------|-----|
| **Knowledge Graph** (medical_graph_edges) | Pesos para P(diagnosis\|symptoms), P(treatment\|diagnosis) |
| **ClickHouse events** | Reservado para futuras extensiones |
| **Clinical records** | Indirecto vía KG |
| **Diagnostics (CIE-10)** | Códigos de diagnóstico |
| **Treatments** | Nombres de tratamientos |

Solo datos agregados. Nunca datos de pacientes individuales.

## Modelo probabilístico

### P(diagnosis | symptoms)

Probabilidad de diagnóstico dado un conjunto de síntomas:

```
P(d|s) = weight(symptom→diagnosis) / Σ weight(symptom→*)
```

- `weight`: suma de co-ocurrencias en el KG
- Normalización por total de pesos desde los nodos síntoma

### P(treatment | diagnosis)

Probabilidad de tratamiento dado diagnóstico:

```
P(t|d) = weight(diagnosis→treatment) / Σ weight(diagnosis→*)
```

Para múltiples síntomas: se suman los pesos de todos los nodos síntoma hacia cada diagnóstico/tratamiento.

## Módulo

`modules/medical-ai-engine`

### Funciones

| Función | Descripción |
|---------|-------------|
| `trainFromKnowledgeGraph(clinicId?)` | Valida el KG y prepara el modelo heurístico |
| `updateClinicalModels(clinicId?)` | Actualiza modelos (re-entrena desde KG) |
| `generatePredictions(symptoms, clinicId?, options?)` | Genera predicciones |
| `suggestClinicalDecisions(symptoms, clinicId?, options?)` | Sugiere decisiones clínicas |
| `predictFromSymptoms(symptoms, clinicId?, options?)` | Predicción principal con confidence scores |
| `enrichSuggestions(symptoms, clinicId, baseResult)` | Enriquece sugerencias de otros módulos |

### Salida de predictFromSymptoms

```json
{
  "predicted_diagnoses": [
    { "code": "R51", "weight": 15, "confidence": 0.42 }
  ],
  "suggested_treatments": [
    { "name": "paracetamol", "weight": 12, "confidence": 0.35 }
  ],
  "confidence_scores": {
    "diagnoses_total_weight": 36,
    "treatments_total_weight": 34,
    "symptom_nodes_matched": 2
  }
}
```

## Actualización automática

El motor actualiza sus modelos cuando:

1. **Knowledge Graph se reconstruye** → se encola `ai-model-refresh`
2. **Job diario** → `ai-model-refresh` a las 4:00 AM (cron: `0 4 * * *`)

El modelo heurístico usa el KG directamente; no almacena un modelo separado. La "actualización" valida que el KG tiene datos.

## API

### POST /api/medical-ai/predict

**Input:**
```json
{
  "symptoms": ["dolor", "cabeza", "fiebre"]
}
```

**Output:**
```json
{
  "predictions": [
    { "code": "R51", "description": "Cefalea", "confidence": 0.42, "weight": 15 }
  ],
  "treatments": [
    { "name": "paracetamol", "confidence": 0.35, "weight": 12 }
  ],
  "confidence": {
    "diagnoses_total_weight": 36,
    "treatments_total_weight": 34,
    "symptom_nodes_matched": 3
  },
  "meta": { "engine_enabled": true }
}
```

**Permisos:** Usuario autenticado con tenant-resolver (clínica requerida).

## Integración

### AI Copilot

Cuando el Copilot devuelve `symptoms_detected`, el Medical AI Engine enriquece las sugerencias con diagnósticos y tratamientos basados en el modelo probabilístico.

### Clinical Intelligence

El endpoint `GET /api/clinical-intelligence/suggest` enriquece sus resultados con predicciones del Medical AI Engine.

## Seguridad

- **Solo datos agregados**: pesos, frecuencias, confidence scores
- **Sin PII**: no nombres, emails, IDs de paciente
- **Aislamiento por clínica**: filtrado por clinic_id cuando aplica

## Uso clínico

Las predicciones son **sugerencias de apoyo** para el médico, no diagnósticos. El médico debe validar siempre con su criterio clínico. Los confidence scores indican la fuerza de la asociación en los datos históricos agregados de la plataforma.
