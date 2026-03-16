'use client';

import React, { useEffect, useState } from 'react';
import {
  fetchPrescriptionsByPatient,
  createPrescription,
  suggestMedications,
} from '../lib/api-ai';

interface PrescriptionPanelProps {
  patientId: number | string;
  consultationId?: number | string;
  diagnosisCode?: string;
  onPrescriptionCreated?: () => void;
  className?: string;
}

/**
 * ePrescription Clinical App - panel de recetas médicas.
 * Integrado en Consultation Workspace y ClinicalAppsPanel.
 */
export function PrescriptionPanel({
  patientId,
  consultationId,
  diagnosisCode,
  onPrescriptionCreated,
  className = '',
}: PrescriptionPanelProps) {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [suggestedMeds, setSuggestedMeds] = useState<{ name: string; confidence?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [medications, setMedications] = useState<string[]>([]);
  const [medInput, setMedInput] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    fetchPrescriptionsByPatient(patientId)
      .then((res) => setPrescriptions(res?.data ?? []))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => {
    setSuggestLoading(true);
    suggestMedications(diagnosisCode)
      .then((res) => setSuggestedMeds(res?.suggested_medications ?? []))
      .catch(() => setSuggestedMeds([]))
      .finally(() => setSuggestLoading(false));
  }, [diagnosisCode]);

  const addMedication = (name: string) => {
    if (name.trim() && !medications.includes(name.trim())) {
      setMedications((p) => [...p, name.trim()]);
    }
  };

  const removeMedication = (name: string) => {
    setMedications((p) => p.filter((m) => m !== name));
  };

  const handleCreatePrescription = async () => {
    const meds = medications.length > 0 ? medications : (medInput.trim() ? [medInput.trim()] : []);
    if (meds.length === 0) return;
    setCreating(true);
    try {
      await createPrescription({
        patient: Number(patientId),
        medications: meds.map((m) => ({ name: m })),
        dosage: dosage || undefined,
        instructions: instructions || undefined,
        appointment: consultationId ? Number(consultationId) : undefined,
      });
      setMedications([]);
      setMedInput('');
      setDosage('');
      setInstructions('');
      onPrescriptionCreated?.();
      const res = await fetchPrescriptionsByPatient(patientId);
      setPrescriptions(res?.data ?? []);
    } catch {
      // Error handled by caller
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className={`rounded-lg border border-gray-200 p-4 ${className}`}>
      <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
        <span>💊</span> Prescriptions
      </h3>
      {loading ? (
        <p className="text-sm text-gray-500">Cargando recetas...</p>
      ) : (
        <>
          {prescriptions.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-gray-600 mb-1">Recetas recientes</h4>
              <ul className="text-sm text-gray-600 space-y-1 max-h-20 overflow-y-auto">
                {prescriptions.slice(0, 3).map((p: any) => (
                  <li key={p.id}>
                    {(p.medications ?? []).map((m: any) => (typeof m === 'string' ? m : m?.name)).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-2">
            {suggestedMeds.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-1">
                  Sugeridos {diagnosisCode ? `(diagnóstico)` : ''}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {suggestedMeds.slice(0, 6).map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => addMedication(m.name)}
                      disabled={suggestLoading}
                      className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    >
                      + {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Añadir medicamento"
                value={medInput}
                onChange={(e) => setMedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMedication(medInput)}
                className="flex-1 text-sm border border-gray-200 rounded px-2 py-1"
              />
              <button
                type="button"
                onClick={() => addMedication(medInput)}
                className="text-sm px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                +
              </button>
            </div>
            {medications.length > 0 && (
              <ul className="space-y-1">
                {medications.map((m) => (
                  <li key={m} className="flex items-center justify-between text-sm">
                    <span>{m}</span>
                    <button type="button" onClick={() => removeMedication(m)} className="text-red-600 hover:underline">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              type="text"
              placeholder="Dosis (opcional)"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded px-2 py-1"
            />
            <textarea
              placeholder="Instrucciones (opcional)"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded px-2 py-1"
            />
            <button
              type="button"
              onClick={handleCreatePrescription}
              disabled={creating || (medications.length === 0 && !medInput.trim())}
              className="w-full text-sm py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? 'Creando...' : 'Crear receta'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
