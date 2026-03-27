export type ProjectStatus = 'rascunho' | 'submetido' | 'aprovado' | 'rejeitado' | 'em_avaliacao' | 'avaliado';
export type FairStatus = 'rascunho' | 'publicado' | 'pausado' | 'encerrado';
export type UserRole = 'admin' | 'manager' | 'advisor' | 'evaluator' | 'student';

export interface User {
  uid: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  role: UserRole;
  institution_id: string;
  settings?: {
    email_notifications: boolean;
    deadline_alerts: boolean;
  };
}

export interface Institution {
  id: string;
  name: string;
  settings: {
    data_isolation: boolean;
    auto_anonymization: boolean;
  };
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date' | 'file' | 'link';
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

export interface Fair {
  id: string;
  name: string;
  description?: string;
  status: FairStatus;
  institution_id: string;
  organizer_id: string;
  dates: {
    registration_start: string | null;
    registration_end: string | null;
    evaluation_start: string | null;
    evaluation_end: string | null;
    results_date: string | null;
  };
  structure: {
    categories: string[];
    modalities: string[];
    target_audience?: string[];
    location_type?: string;
    custom_form?: FormField[];
  };
  rules: {
    blind_evaluation: boolean;
    min_evaluators_per_project: number;
    tie_breaker_hierarchy: string[];
  };
  created_at: string;
}

export interface EvaluationCriteria {
  id: string;
  fair_id: string;
  category?: string;
  name: string;
  description?: string;
  weight: number;
  scale_type: 'numeric' | 'rubric';
  max_score: number;
  rubrics?: Record<number, string>;
}

export interface Project {
  id: string;
  title: string;
  abstract?: string;
  category: string;
  modality: string;
  status: ProjectStatus;
  fair_id: string;
  institution_id: string;
  creator_id: string;
  members: ProjectMember[];
  evidence: {
    files: EvidenceFile[];
    links: EvidenceLink[];
  };
  custom_data?: Record<string, any>;
  current_version: number;
  created_at: string;
}

export interface ProjectMember {
  name: string;
  email: string;
  role: string;
  justification?: string;
}

export interface EvidenceFile {
  name: string;
  url: string;
  type: string;
}

export interface EvidenceLink {
  label: string;
  url: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  data: any;
  created_by: string;
  created_at: string;
}

export interface Evaluation {
  id: string;
  project_id: string;
  evaluator_id: string;
  scores: Record<string, number>;
  criterion_feedback?: Record<string, string>;
  feedback?: string;
  status: 'rascunho' | 'finalizado';
  is_conflict_declared: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  userName?: string; // Joined
  action: string;
  target_table: string;
  target_id: string;
  old_data?: any;
  new_data?: any;
  institution_id: string;
  created_at: string;
}

export interface KPI {
  label: string;
  value: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: string;
  status?: 'Crítico' | 'Normal' | 'Atenção';
}

export interface Stage {
  id: number;
  label: string;
  count: string;
  status: 'completed' | 'active' | 'pending';
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  type: 'error' | 'warning' | 'info';
}

export interface EvaluatorApplication {
  id: string;
  fair_id: string;
  user_id: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  created_at: string;
  institution_id: string;
}
