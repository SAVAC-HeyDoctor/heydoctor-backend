# First Clinical Apps – Lab Orders, Prescriptions, AI Clinical Insights

Documentación de las tres primeras Clinical Apps implementadas en el AI Doctor OS de HeyDoctor, que completan el flujo clínico del médico.

---

## 1. Resumen

| App | Módulo | Endpoints | Integración |
|-----|--------|-----------|-------------|
| **Lab Orders** | `modules/clinical-apps/lab-orders` | POST, GET /patient/:id, GET /suggest-tests | CDSS, FHIR Observation |
| **Prescriptions** | `modules/clinical-apps/prescriptions` | POST, GET /patient/:id, GET /suggest-medications | CDSS, Predictive Medicine, FHIR MedicationRequest |
| **AI Clinical Insights** | `modules/clinical-apps/clinical-insights` | GET /patient/:id | Predictive Medicine, Clinical Intelligence, Knowledge Graph |

---

## 2. Lab Orders App

### Ubicación

- **Módulo:** `modules/clinical-apps/lab-orders/index.js`
- **Content type:** `api::lab-order.lab-order`
- **API:** `src/api/lab-order/`

### Funciones

| Función | Descripción |
|---------|-------------|
| `suggestLabTests(diagnosisCodeOrSymptoms, clinicId)` | Sugiere exámenes según diagnóstico usando CDSS |
| `labOrderToFhirObservationRequest(labOrder, patientId)` | Convierte orden a FHIR ServiceRequest (ObservationRequest) |

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/lab-orders` | Crear orden de laboratorio |
| GET | `/api/lab-orders/patient/:id` | Listar órdenes por paciente |
| GET | `/api/lab-orders/suggest-tests?diagnosis=X` | Sugerir exámenes según diagnóstico |

### Datos de orden

| Campo | Tipo | Descripción |
|-------|------|-------------|
| patient | relation | Paciente |
| doctor | relation | Médico |
| diagnosis_code | string | Código diagnóstico (CIE-10) |
| lab_tests | JSON | array de exámenes |
| status | enum | pending, ordered, in_progress, completed, cancelled |
| clinic | relation | Clínica |
| appointment | relation | Consulta (opcional) |

### Integración

- **CDSS:** Usa `cdss.evaluate()` para sugerir exámenes según síntomas/diagnóstico
- **FHIR:** Convierte órdenes a `ServiceRequest` (equivalente a ObservationRequest en FHIR R4)

### Frontend

- **Componente:** `LabOrdersPanel`
- **Props:** `patientId`, `consultationId`, `diagnosisCode`, `onOrderCreated`
- **Integración:** AiConsultationPanel, ClinicalAppsPanel

---

## 3. ePrescription App

### Ubicación

- **Módulo:** `modules/clinical-apps/prescriptions/index.js`
- **Content type:** `api::prescription.prescription`
- **API:** `src/api/prescription/`

### Funciones

| Función | Descripción |
|---------|-------------|
| `suggestMedications(diagnosisCodeOrSymptoms, clinicId)` | Sugiere medicamentos usando CDSS y Predictive Medicine |
| `prescriptionToFhirMedicationRequest(prescription, patientId)` | Convierte receta a FHIR MedicationRequest |

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/prescriptions` | Crear receta |
| GET | `/api/prescriptions/patient/:id` | Listar recetas por paciente |
| GET | `/api/prescriptions/suggest-medications?diagnosis=X` | Sugerir medicamentos según diagnóstico |

### Datos de receta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| patient | relation | Paciente |
| doctor | relation | Médico |
| medications | JSON | array de medicamentos (objeto con name) |
| dosage | text | Dosis |
| instructions | text | Instrucciones |
| clinic | relation | Clínica |
| appointment | relation | Consulta (opcional) |

### Integración

- **CDSS:** `treatment_recommendations` para medicamentos sugeridos
- **Predictive Medicine:** `suggested_treatments` y `preventive_actions`
- **FHIR:** Convierte a `MedicationRequest` por cada medicamento

### Frontend

- **Componente:** `PrescriptionPanel`
- **Props:** `patientId`, `consultationId`, `diagnosisCode`, `onPrescriptionCreated`
- **Integración:** AiConsultationPanel, ClinicalAppsPanel

---

## 4. AI Clinical Insights App

### Ubicación

- **Módulo:** `modules/clinical-apps/clinical-insights/index.js`
- **API:** `src/api/clinical-insight/` (sin content type)

### Funciones

| Función | Descripción |
|---------|-------------|
| `getPatientInsights(patientId, symptoms, clinicId)` | Agrega insights de Predictive Medicine, Clinical Intelligence y Knowledge Graph |

### Endpoint

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/clinical-insight/patient/:id?symptoms=a,b` | Obtener insights clínicos del paciente |

### Datos mostrados

| Campo | Fuente | Descripción |
|-------|--------|-------------|
| predicted_conditions | Predictive Medicine | Condiciones predichas con riesgo |
| risk_scores | Predictive Medicine | Scores de riesgo por condición |
| clinical_patterns | Clinical Intelligence | Patrones diagnósticos históricos |
| recommended_actions | Predictive + CI | Acciones preventivas y tratamientos |

### Fuentes de datos

- **Predictive Medicine:** `predictHealthRisks()` – condiciones predichas, acciones preventivas
- **Clinical Intelligence:** `analyzeSymptoms()` – top_diagnostics, top_treatments
- **Knowledge Graph:** `queryKnowledgeGraph()` – diagnósticos relacionados

### Frontend

- **Componente:** `ClinicalInsightsPanel`
- **Props:** `patientId`, `symptoms`
- **Integración:** AiConsultationPanel, Patient Profile (PatientInsightsPanel)

---

## 5. Registro en Clinical Apps Registry

Las tres apps están registradas en `modules/clinical-apps/registry.js`:

```javascript
registerClinicalApp({
  name: "lab-orders",
  description: "Order laboratory tests",
  category: "diagnostics",
  icon: "flask",
  ...
});

registerClinicalApp({
  name: "prescriptions",
  description: "Create and manage prescriptions",
  category: "pharmacy",
  icon: "pill",
  ...
});

registerClinicalApp({
  name: "clinical-insights",
  description: "AI clinical insights for the patient",
  category: "insights",
  icon: "chart",
  ...
});
```

---

## 6. Integración FHIR

Las apps usan los recursos FHIR existentes:

| Recurso | Uso |
|---------|-----|
| **Patient** | Identificación del paciente en consultas |
| **Encounter** | Contexto de la consulta (appointment) |
| **Observation** | Resultados de lab (clinical_record, diagnostic) |
| **MedicationRequest** | Prescripciones |

Los módulos lab-orders y prescriptions exponen conversores a FHIR:

- `labOrderToFhirObservationRequest()` → ServiceRequest (ObservationRequest)
- `prescriptionToFhirMedicationRequest()` → MedicationRequest[]

---

## 7. Flujo clínico

```
1. Médico abre consulta
   └─ Obtiene consultationId, patientId

2. Durante la consulta (AiConsultationPanel):
   ├─ Copilot: sugerencias de diagnósticos/tratamientos
   ├─ CDSS: alertas clínicas
   ├─ Predictive: riesgos y acciones preventivas
   ├─ Clinical Insights: insights del paciente
   ├─ Lab Orders: crear orden, listar, sugerir exámenes
   └─ Prescriptions: crear receta, listar, sugerir medicamentos

3. Al seleccionar diagnóstico:
   ├─ Lab Orders: sugiere exámenes (CDSS)
   └─ Prescriptions: sugiere medicamentos (CDSS + Predictive)

4. En perfil del paciente:
   └─ Clinical Insights: predicted_conditions, risk_scores, patterns
```

---

## 8. Doctor UI

### ClinicalAppsPanel

Muestra las apps:

- **Lab Orders** – 🧪
- **Prescriptions** – 💊
- **AI Clinical Insights** – 📊

### AiConsultationPanel

Cuando `patientId` está disponible, muestra:

- ClinicalInsightsPanel
- LabOrdersPanel
- PrescriptionPanel

### Patient Profile

PatientInsightsPanel con `patientId` muestra:

- ClinicalInsightsPanel

---

## 9. Eventos de analytics

| Evento | Cuándo |
|--------|--------|
| `test_ordered` | Al crear lab order |
| `prescription_created` | Al crear prescription |

---

## 10. Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `modules/clinical-apps/lab-orders/index.js` | Módulo Lab Orders |
| `modules/clinical-apps/prescriptions/index.js` | Módulo Prescriptions |
| `modules/clinical-apps/clinical-insights/index.js` | Módulo Clinical Insights |
| `src/api/lab-order/` | API Lab Orders |
| `src/api/prescription/` | API Prescriptions |
| `src/api/clinical-insight/` | API Clinical Insights |
| `frontend/components/LabOrdersPanel.tsx` | Panel Lab Orders |
| `frontend/components/PrescriptionPanel.tsx` | Panel Prescriptions |
| `frontend/components/ClinicalInsightsPanel.tsx` | Panel Clinical Insights |
