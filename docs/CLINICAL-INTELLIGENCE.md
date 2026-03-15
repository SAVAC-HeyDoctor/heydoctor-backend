# Clinical Intelligence - HeyDoctor

Capa de inteligencia clínica que analiza datos históricos agregados para generar sugerencias médicas basadas en datos reales de la plataforma.

## Requisitos

- Strapi, PostgreSQL
- Multi-tenant basado en `clinic`
- ClickHouse (opcional, para futuras extensiones)

## Módulo

`modules/clinical-intelligence`

### Funciones

#### `analyzeSymptoms(symptoms, clinicId?)`

Analiza síntomas y devuelve patrones agregados.

**Entrada:**
- `symptoms`: texto con síntomas (ej: "dolor de cabeza fiebre")
- `clinicId`: opcional, filtra por clínica

**Salida:**
```json
{
  "matched_records": 42,
  "top_diagnostics": [{ "code": "R51", "description": "Cefalea", "count": 15 }],
  "top_treatments": [{ "name": "Paracetamol", "count": 12 }]
}
```

#### `suggestDiagnoses(symptoms, clinicId?, limit?)`

Sugiere diagnósticos (CIE-10) basados en frecuencia en registros que coinciden con los síntomas.

#### `suggestTreatments(symptoms, clinicId?, limit?)`

Sugiere tratamientos basados en frecuencia en registros que coinciden con los síntomas.

#### `getClinicalPatterns(clinicId?, options?)`

Patrones clínicos agregados:
- Diagnósticos más frecuentes
- Tratamientos más frecuentes por diagnóstico

## Fuentes de datos

| Fuente | Uso |
|--------|-----|
| **clinical_record** (PostgreSQL) | admission_reason (síntomas/motivo de consulta), observations |
| **diagnostic** (PostgreSQL) | CIE-10, relación con clinical_record |
| **treatment** (PostgreSQL) | nombre, relación con clinical_record |
| **cie-10-code** (PostgreSQL) | código y descripción |
| **ClickHouse events** | Reservado para futuras extensiones (consultas, métricas) |

## Algoritmo

1. **Frecuencia de diagnósticos por síntomas**
   - Busca clinical_records donde `admission_reason` contiene los términos de síntomas
   - Agrupa diagnósticos (CIE-10) asociados a esos registros
   - Ordena por frecuencia descendente

2. **Frecuencia de tratamientos por síntomas**
   - Mismos registros que coinciden con síntomas
   - Agrupa tratamientos asociados
   - Ordena por frecuencia descendente

3. **Tratamientos por diagnóstico** (en getClinicalPatterns)
   - Para cada diagnóstico frecuente, agrupa tratamientos de sus registros clínicos

## API

### GET /api/clinical-intelligence/suggest

**Query:**
- `symptoms` (requerido): texto con síntomas, ej. "dolor de cabeza persistente"

**Respuesta:**
```json
{
  "suggested_diagnoses": [
    { "code": "R51", "description": "Cefalea", "frequency": 15 },
    { "code": "G43", "description": "Migraña", "frequency": 8 }
  ],
  "suggested_treatments": [
    { "name": "Paracetamol 500mg", "frequency": 12 },
    { "name": "Ibuprofeno", "frequency": 7 }
  ]
}
```

**Permisos:** Usuario autenticado con `tenant-resolver` (clínica requerida). Los resultados se filtran por la clínica del usuario.

## Seguridad

- **Solo datos agregados**: nunca se exponen registros de pacientes individuales
- **Conteos y frecuencias**: únicamente se devuelven códigos CIE, descripciones y conteos
- **Aislamiento por clínica**: cuando el usuario tiene clínica, los datos se filtran por `clinic_id`
- **Sin PII**: no se incluyen nombres, IDs de paciente, fechas de nacimiento ni datos identificables
