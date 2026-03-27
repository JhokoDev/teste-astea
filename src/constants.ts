import { Project, KPI, Stage, Alert } from './types';

export const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Eco-Plastic Bio-Polymer',
    category: 'Sustentabilidade',
    modality: 'Pesquisa Científica',
    status: 'avaliado',
    fair_id: 'fair-1',
    institution_id: 'inst-1',
    creator_id: 'user-1',
    members: [],
    evidence: { files: [], links: [] },
    current_version: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Solar Tracker V2',
    category: 'Engenharia',
    modality: 'Desenvolvimento Tecnológico',
    status: 'em_avaliacao',
    fair_id: 'fair-1',
    institution_id: 'inst-1',
    creator_id: 'user-2',
    members: [],
    evidence: { files: [], links: [] },
    current_version: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Neuro-Interface VR',
    category: 'Tecnologia',
    modality: 'Pesquisa Científica',
    status: 'submetido',
    fair_id: 'fair-1',
    institution_id: 'inst-1',
    creator_id: 'user-3',
    members: [],
    evidence: { files: [], links: [] },
    current_version: 1,
    created_at: new Date().toISOString(),
  },
];

export const MOCK_KPIS: KPI[] = [
  {
    label: 'Projetos',
    value: '124',
    trend: { value: '+12%', isPositive: true },
    icon: 'Rocket',
  },
  {
    label: 'Orientadores',
    value: '45',
    trend: { value: '-2%', isPositive: false },
    icon: 'GraduationCap',
  },
  {
    label: 'Avaliadores',
    value: '32',
    trend: { value: '+5%', isPositive: true },
    icon: 'UserSearch',
  },
  {
    label: 'Prazo Restante',
    value: '12 dias',
    status: 'Crítico',
    icon: 'Timer',
  },
];

export const MOCK_STAGES: Stage[] = [
  { id: 1, label: 'Inscrição', count: '124 Projetos', status: 'completed' },
  { id: 2, label: 'Homologação', count: '98 Projetos', status: 'completed' },
  { id: 3, label: 'Avaliação', count: 'Ativa', status: 'active' },
  { id: 4, label: 'Finalistas', count: 'Pendente', status: 'pending' },
];

export const MOCK_ALERTS: Alert[] = [
  {
    id: '1',
    title: 'Prazo de Homologação',
    description: 'Expira em 24h para 12 projetos.',
    type: 'error',
  },
  {
    id: '2',
    title: 'Avaliadores Faltantes',
    description: 'Categoria: Biologia necessita 2 juízes.',
    type: 'warning',
  },
  {
    id: '3',
    title: 'Dúvidas de Orientadores',
    description: '5 novos chamados abertos.',
    type: 'info',
  },
];
