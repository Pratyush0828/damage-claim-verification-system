export type ObjectType = "car" | "laptop" | "package";
export type Decision = "Valid" | "Suspicious" | "Fraudulent";

export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface EvidenceRequirement {
  key: string;
  label: string;
  description: string;
}

export interface ClaimImage {
  id: string;
  file_name: string;
  url: string;
  evidence_type: string;
  detected_object: string | null;
  damage_detected: boolean;
  severity: string;
  quality_score: number;
  analysis: {
    observations?: string[];
    provider?: string;
  };
}

export interface Signal {
  name: string;
  score?: number;
  severity: "low" | "medium" | "high";
  detail: string;
}

export interface Claim {
  id: string;
  object_type: ObjectType;
  title: string;
  description: string;
  incident_date: string | null;
  status: "processing" | "completed" | "failed";
  decision: Decision | null;
  confidence_score: number;
  fraud_probability: number;
  trust_score: number;
  image_score: number;
  nlp_score: number;
  history_score: number;
  evidence_score: number;
  missing_evidence: string[];
  extracted_insights: Record<string, any>;
  reasoning_summary: string;
  images: ClaimImage[];
  conversations: { role: string; content: string; sequence: number }[];
  fraud_report: { signals: Signal[]; model_version: string } | null;
  created_at: string;
  updated_at: string;
}

export interface AccuracyMetrics {
  reviewed_claims: number;
  correct_predictions: number;
  accuracy: number | null;
  macro_precision: number | null;
  macro_recall: number | null;
  macro_f1: number | null;
  class_metrics: Record<string, { support: number; precision: number; recall: number; f1: number }>;
  message: string;
}

export interface ClaimReview {
  claim_id: string;
  predicted_decision: Decision;
  actual_decision: Decision;
  correct: boolean;
  notes: string;
}

export type ClaimListItem = Pick<
  Claim,
  "id" | "object_type" | "title" | "status" | "decision" | "confidence_score" | "fraud_probability" | "missing_evidence" | "created_at"
>;
