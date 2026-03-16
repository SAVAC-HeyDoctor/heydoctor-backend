'use client';

import React, { useEffect, useState } from 'react';
import {
  fetchLabOrdersByPatient,
  createLabOrder,
  suggestLabTests,
} from '../lib/api-ai';

interface LabOrdersPanelProps {
  patientId: number | string;
  consultationId?: number | string;
  diagnosisCode?: string;
  onOrderCreated?: () => void;
  className?: string;
}

/**
 * Lab Orders Clinical App - panel de órdenes de laboratorio.
 * Integrado en Consultation Workspace y ClinicalAppsPanel.
 */
export function LabOrdersPanel({
  patientId,
  consultationId,
  diagnosisCode,
  onOrderCreated,
  className = '',
}: LabOrdersPanelProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [suggestedTests, setSuggestedTests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [testInput, setTestInput] = useState('');

  useEffect(() => {
    fetchLabOrdersByPatient(patientId)
      .then((res) => setOrders(res?.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => {
    setSuggestLoading(true);
    suggestLabTests(diagnosisCode)
      .then((res) => setSuggestedTests(res?.suggested_tests ?? []))
      .catch(() => setSuggestedTests([]))
      .finally(() => setSuggestLoading(false));
  }, [diagnosisCode]);

  const addTest = (test: string) => {
    if (test.trim() && !selectedTests.includes(test.trim())) {
      setSelectedTests((p) => [...p, test.trim()]);
    }
  };

  const removeTest = (test: string) => {
    setSelectedTests((p) => p.filter((t) => t !== test));
  };

  const handleCreateOrder = async () => {
    const tests = selectedTests.length > 0 ? selectedTests : (testInput.trim() ? [testInput.trim()] : []);
    if (tests.length === 0) return;
    setCreating(true);
    try {
      await createLabOrder({
        patient: Number(patientId),
        lab_tests: tests,
        diagnosis_code: diagnosisCode,
        appointment: consultationId ? Number(consultationId) : undefined,
      });
      setSelectedTests([]);
      setTestInput('');
      onOrderCreated?.();
      const res = await fetchLabOrdersByPatient(patientId);
      setOrders(res?.data ?? []);
    } catch {
      // Error handled by caller
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className={`rounded-lg border border-gray-200 p-4 ${className}`}>
      <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
        <span>🧪</span> Lab Orders
      </h3>
      {loading ? (
        <p className="text-sm text-gray-500">Cargando órdenes...</p>
      ) : (
        <>
          {orders.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-gray-600 mb-1">Órdenes recientes</h4>
              <ul className="text-sm text-gray-600 space-y-1 max-h-24 overflow-y-auto">
                {orders.slice(0, 5).map((o: any) => (
                  <li key={o.id}>
                    {(o.lab_tests ?? []).join(', ')} – {o.status ?? 'pending'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-2">
            {suggestedTests.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-1">
                  Sugeridos {diagnosisCode ? `(diagnóstico)` : ''}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {suggestedTests.slice(0, 6).map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => addTest(t)}
                      disabled={suggestLoading}
                      className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Añadir examen"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTest(testInput)}
                className="flex-1 text-sm border border-gray-200 rounded px-2 py-1"
              />
              <button
                type="button"
                onClick={() => addTest(testInput)}
                className="text-sm px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                +
              </button>
            </div>
            {selectedTests.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 mb-1">Seleccionados:</p>
                <ul className="space-y-1">
                  {selectedTests.map((t) => (
                    <li key={t} className="flex items-center justify-between text-sm">
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => removeTest(t)}
                        className="text-red-600 hover:underline"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={handleCreateOrder}
              disabled={creating || (selectedTests.length === 0 && !testInput.trim())}
              className="w-full text-sm py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? 'Creando...' : 'Crear orden de laboratorio'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
