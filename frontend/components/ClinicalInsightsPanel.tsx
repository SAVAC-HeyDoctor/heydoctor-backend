'use client';

import React, { useEffect, useState } from 'react';
import { fetchClinicalInsights } from '../lib/api-ai';

interface ClinicalInsightsPanelProps {
  patientId: number | string;
  symptoms?: string[];
  className?: string;
}

/**
 * AI Clinical Insights Clinical App - insights clínicos del paciente.
 * Integrado en AiConsultationPanel y Patient Profile.
 * Fuentes: Predictive Medicine, Clinical Intelligence, Knowledge Graph.
 */
export function ClinicalInsightsPanel({
  patientId,
  symptoms = [],
  className = '',
}: ClinicalInsightsPanelProps) {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClinicalInsights(patientId, symptoms)
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setLoading(false));
  }, [patientId, symptoms.join(',')]);

  if (loading) {
    return (
      <section className={`rounded-lg border border-gray-200 p-4 ${className}`}>
        <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
          <span>📊</span> AI Clinical Insights
        </h3>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </section>
    );
  }

  if (!insights) {
    return (
      <section className={`rounded-lg border border-gray-200 p-4 ${className}`}>
        <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
          <span>📊</span> AI Clinical Insights
        </h3>
        <p className="text-sm text-gray-500">No hay insights disponibles</p>
      </section>
    );
  }

  const predicted = insights.predicted_conditions ?? [];
  const riskScores = insights.risk_scores ?? [];
  const patterns = insights.clinical_patterns ?? [];
  const actions = insights.recommended_actions ?? [];

  const hasContent = predicted.length > 0 || riskScores.length > 0 || patterns.length > 0 || actions.length > 0;

  if (!hasContent) {
    return (
      <section className={`rounded-lg border border-gray-200 p-4 ${className}`}>
        <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
          <span>📊</span> AI Clinical Insights
        </h3>
        <p className="text-sm text-gray-500">Sin datos suficientes para generar insights</p>
      </section>
    );
  }

  return (
    <section className={`rounded-lg border border-gray-200 p-4 ${className}`}>
      <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
        <span>📊</span> AI Clinical Insights
      </h3>
      <div className="space-y-3 text-sm">
        {predicted.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-600 mb-1">Condiciones predichas</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-0.5">
              {predicted.slice(0, 5).map((c: any, i: number) => (
                <li key={i}>
                  {c.code ?? c.description ?? c.condition} – {((c.risk_score ?? 0) * 100).toFixed(0)}% riesgo
                </li>
              ))}
            </ul>
          </div>
        )}
        {riskScores.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-600 mb-1">Scores de riesgo</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-0.5">
              {riskScores.slice(0, 5).map((r: any, i: number) => (
                <li key={i}>
                  {r.code ?? r.condition} – {((r.risk_score ?? 0) * 100).toFixed(0)}%
                </li>
              ))}
            </ul>
          </div>
        )}
        {patterns.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-600 mb-1">Patrones clínicos</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-0.5">
              {patterns.slice(0, 5).map((p: any, i: number) => (
                <li key={i}>{p.code ?? p.description} ({p.count ?? 0} casos)</li>
              ))}
            </ul>
          </div>
        )}
        {actions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-600 mb-1">Acciones recomendadas</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-0.5">
              {actions.slice(0, 5).map((a: any, i: number) => (
                <li key={i}>{a.recommendation ?? a.type ?? a.action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
