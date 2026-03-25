import { supabase } from '../supabase';
import { Fair, Project, Evaluation, AuditLog, ProjectVersion, EvaluationCriteria } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  table: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
  }
}

async function handleSupabaseError(error: any, operationType: OperationType, table: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  const errInfo: SupabaseErrorInfo = {
    error: error.message || String(error),
    authInfo: {
      userId: user?.id,
      email: user?.email,
    },
    operationType,
    table
  };
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper for audit logs (RF16)
async function logAction(action: string, table: string, id: string, oldData?: any, newData?: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get user's institution
  const { data: profile } = await supabase
    .from('users')
    .select('institutionId')
    .eq('uid', user.id)
    .single();

  await supabase.from('audit_logs').insert({
    userId: user.id,
    action,
    target_table: table,
    target_id: id,
    old_data: oldData,
    new_data: newData,
    institutionId: profile?.institutionId
  });
}

// Service methods
export const fairsService = {
  subscribeToFairs: (callback: (fairs: Fair[]) => void) => {
    supabase.from('fairs').select('*').then(({ data, error }) => {
      if (error) handleSupabaseError(error, OperationType.LIST, 'fairs');
      if (data) callback(data as Fair[]);
    });

    const subscription = supabase
      .channel('fairs_changes')
      .on('postgres_changes' as any, { event: '*', table: 'fairs' }, async () => {
        const { data, error } = await supabase.from('fairs').select('*');
        if (error) handleSupabaseError(error, OperationType.LIST, 'fairs');
        if (data) callback(data as Fair[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  createFair: async (data: Partial<Fair>) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get user's institution
    const { data: profile } = await supabase
      .from('users')
      .select('institutionId')
      .eq('uid', user?.id)
      .single();

    const { data: newFair, error } = await supabase
      .from('fairs')
      .insert({
        ...data,
        organizerId: user?.id,
        institutionId: profile?.institutionId || 'default-inst'
      })
      .select()
      .single();

    if (error) handleSupabaseError(error, OperationType.CREATE, 'fairs');
    if (newFair) await logAction('CREATE_FAIR', 'fairs', newFair.id, null, newFair);
    return newFair as Fair;
  },

  updateFair: async (id: string, data: Partial<Fair>) => {
    const { data: oldFair } = await supabase.from('fairs').select('*').eq('id', id).single();
    
    const { data: updatedFair, error } = await supabase
      .from('fairs')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error, OperationType.UPDATE, 'fairs');
    if (updatedFair) await logAction('UPDATE_FAIR', 'fairs', id, oldFair, updatedFair);
    return updatedFair as Fair;
  }
};

export const projectsService = {
  subscribeToProjects: (callback: (projects: Project[]) => void) => {
    supabase.from('projects').select('*').then(({ data, error }) => {
      if (error) handleSupabaseError(error, OperationType.LIST, 'projects');
      if (data) callback(data as Project[]);
    });

    const subscription = supabase
      .channel('projects_changes')
      .on('postgres_changes' as any, { event: '*', table: 'projects' }, async () => {
        const { data, error } = await supabase.from('projects').select('*');
        if (error) handleSupabaseError(error, OperationType.LIST, 'projects');
        if (data) callback(data as Project[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  submitProject: async (data: Partial<Project>) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('users').select('institutionId').eq('uid', user?.id).single();

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        ...data,
        creatorId: user?.id,
        institutionId: profile?.institutionId || 'default-inst',
        status: 'submetido'
      })
      .select()
      .single();

    if (error) handleSupabaseError(error, OperationType.CREATE, 'projects');
    
    // Create first version (RF06)
    if (newProject) {
      await supabase.from('project_versions').insert({
        projectId: newProject.id,
        version_number: 1,
        data: newProject,
        created_by: user?.id
      });
      await logAction('SUBMIT_PROJECT', 'projects', newProject.id, null, newProject);
    }

    return newProject as Project;
  },

  updateProject: async (id: string, data: Partial<Project>, justification?: string) => {
    const { data: oldProject } = await supabase.from('projects').select('*').eq('id', id).single();
    const { data: { user } } = await supabase.auth.getUser();

    const newVersionNumber = (oldProject?.current_version || 1) + 1;

    const { data: updatedProject, error } = await supabase
      .from('projects')
      .update({
        ...data,
        current_version: newVersionNumber
      })
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error, OperationType.UPDATE, 'projects');

    if (updatedProject) {
      // Create new version (RF06)
      await supabase.from('project_versions').insert({
        projectId: id,
        version_number: newVersionNumber,
        data: updatedProject,
        created_by: user?.id
      });
      await logAction('UPDATE_PROJECT', 'projects', id, { ...oldProject, justification }, updatedProject);
    }

    return updatedProject as Project;
  }
};

export const evaluationsService = {
  submitEvaluation: async (data: Partial<Evaluation>) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: newEval, error } = await supabase
      .from('evaluations')
      .insert({
        ...data,
        evaluatorId: user?.id,
        status: 'finalizado'
      })
      .select()
      .single();

    if (error) handleSupabaseError(error, OperationType.CREATE, 'evaluations');
    if (newEval) await logAction('SUBMIT_EVALUATION', 'evaluations', newEval.id, null, newEval);
    return newEval as Evaluation;
  }
};
