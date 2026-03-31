export type ProjectStatus = 'rascunho' | 'submetido' | 'aprovado' | 'rejeitado' | 'em_avaliacao' | 'avaliado';
export type FairStatus = 'rascunho' | 'publicado' | 'pausado' | 'encerrado';
export type UserRole = 'admin' | 'manager' | 'advisor' | 'evaluator' | 'student';

export interface User {
  uid: string;
  email: string;
  displayname: string;
  photourl: string | null;
  role: UserRole;
  institutionid: string;
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
  institutionid: string;
  organizerid: string;
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
  createdat: string;
}

export interface EvaluationCriteria {
  id: string;
  fairid: string;
  category?: string;
  name: string;
  description?: string;
  weight: number;
  scaletype: 'numeric' | 'rubric';
  maxscore: number;
  rubrics?: Record<number, string>;
}

export interface Project {
  id: string;
  title: string;
  abstract?: string;
  category: string;
  modality: string;
  status: ProjectStatus;
  fairid: string;
  institutionid: string;
  creatorid: string;
  members: ProjectMember[];
  evidence: {
    files: EvidenceFile[];
    links: EvidenceLink[];
  };
  customdata?: Record<string, any>;
  advisorEmail?: string;
  currentversion: number;
  createdat: string;
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
  projectid: string;
  versionnumber: number;
  data: any;
  createdby: string;
  createdat: string;
}

export interface Evaluation {
  id: string;
  projectid: string;
  evaluatorid: string;
  scores: Record<string, number>;
  criterionfeedback?: Record<string, string>;
  feedback?: string;
  status: 'rascunho' | 'finalizado';
  isconflictdeclared: boolean;
  createdat: string;
  updatedat: string;
}

export interface AuditLog {
  id: string;
  userid: string;
  userName?: string; // Joined
  action: string;
  targettable: string;
  targetid: string;
  olddata?: any;
  newdata?: any;
  institutionid: string;
  createdat: string;
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
  fairid: string;
  userid: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  createdat: string;
  institutionid: string;
}
