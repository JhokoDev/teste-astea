import { UserRole } from '../types';

/**
 * Mapeamento de e-mails para funções específicas no sistema.
 * Use este arquivo para definir permissões padrão para usuários de teste ou administradores.
 */
export const DEFAULT_USER_ROLES: Record<string, UserRole> = {
  // Administradores
  'admin@gmail.com': 'admin',
  'aistudiojhoko@gmail.com': 'admin',
  
  // Gerenciadores de Feira
  'gerenciador@gmail.com': 'manager',
  
  // Orientadores
  'orientador@gmail.com': 'advisor',
  
  // Avaliadores
  'avaliador@gmail.com': 'evaluator',
  
  // Alunos / Padrão
  'user@gmail.com': 'student',
};

/**
 * Retorna a função de um usuário com base no e-mail.
 * Se o e-mail não estiver mapeado, retorna 'student' por padrão.
 */
export function getRoleByEmail(email: string | undefined): UserRole {
  if (!email) return 'student';
  return DEFAULT_USER_ROLES[email.toLowerCase()] || 'student';
}
