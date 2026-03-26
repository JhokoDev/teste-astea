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
  
  // Support mock user
  const mockUserStr = localStorage.getItem('dev_user');
  const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
  const userId = user?.id || mockUser?.id;
  
  if (!userId) return;

  // For database foreign keys to auth.users, we must use a real UUID or null
  // Handle both old 'dev-admin-id' and new '00000000-0000-0000-0000-000000000000'
  const isMockId = userId === '00000000-0000-0000-0000-000000000000' || userId === 'dev-admin-id';
  const dbUserId = isMockId ? null : userId;

  // Get user's institution
  const { data: profile } = await supabase
    .from('users')
    .select('institutionId')
    .eq('uid', userId)
    .maybeSingle();

  await supabase.from('audit_logs').insert({
    userId: dbUserId,
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
    console.log('supabaseService: createFair called with:', data);
    
    // Sanitize data to remove fields that are now in 'structure'
    const { location_type, target_audience, ...sanitizedData } = data as any;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no real user, check for mock user in localStorage
    const mockUserStr = localStorage.getItem('dev_user');
    const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
    const userId = user?.id || mockUser?.id;
    
    // For database foreign keys to auth.users, we must use a real UUID or null
    // Handle both old 'dev-admin-id' and new '00000000-0000-0000-0000-000000000000'
    const isMockId = userId === '00000000-0000-0000-0000-000000000000' || userId === 'dev-admin-id';
    const dbUserId = isMockId ? null : userId;

    console.log('supabaseService: userId for creation:', userId, 'dbUserId:', dbUserId);

    // Get user's institution
    let institutionId = 'default-inst';
    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('institutionId')
        .eq('uid', userId)
        .maybeSingle();
      
      if (profileError) {
        console.warn('Erro ao buscar perfil para instituição:', profileError);
      } else if (profile) {
        institutionId = profile.institutionId;
      }
    }

    console.log('supabaseService: final institutionId:', institutionId);

    const { data: newFair, error } = await supabase
      .from('fairs')
      .insert({
        ...sanitizedData,
        organizerId: dbUserId,
        institutionId: institutionId
      })
      .select()
      .single();

    if (error) {
      console.error('supabaseService: Error inserting fair:', error);
      await handleSupabaseError(error, OperationType.CREATE, 'fairs');
    }
    
    if (newFair) {
      console.log('supabaseService: Fair created successfully:', newFair);
      await logAction('CREATE_FAIR', 'fairs', newFair.id, null, newFair);
    }
    return newFair as Fair;
  },

  updateFair: async (id: string, data: Partial<Fair>) => {
    const { data: oldFair } = await supabase.from('fairs').select('*').eq('id', id).single();
    
    // Sanitize data to remove fields that are now in 'structure'
    const { location_type, target_audience, ...sanitizedData } = data as any;
    
    const { data: updatedFair, error } = await supabase
      .from('fairs')
      .update(sanitizedData)
      .eq('id', id)
      .select()
      .single();

    if (error) await handleSupabaseError(error, OperationType.UPDATE, 'fairs');
    if (updatedFair) await logAction('UPDATE_FAIR', 'fairs', id, oldFair, updatedFair);
    return updatedFair as Fair;
  },

  applyAsEvaluator: async (fairId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const mockUserStr = localStorage.getItem('dev_user');
    const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
    const userId = user?.id || mockUser?.id;
    const isMockId = userId === '00000000-0000-0000-0000-000000000000' || userId === 'dev-admin-id';
    const dbUserId = isMockId ? null : userId;

    const { data: profile } = await supabase.from('users').select('institutionId').eq('uid', userId).maybeSingle();

    const { data: application, error } = await supabase
      .from('evaluator_applications')
      .insert({
        fairId,
        userId: dbUserId,
        institutionId: profile?.institutionId || 'default-inst',
        status: 'pendente'
      })
      .select()
      .single();

    if (error) await handleSupabaseError(error, OperationType.CREATE, 'evaluator_applications');
    if (application) await logAction('APPLY_AS_EVALUATOR', 'evaluator_applications', application.id, null, application);
    return application;
  },

  getEvaluationCriteria: async (fairId: string) => {
    const { data, error } = await supabase
      .from('evaluation_criteria')
      .select('*')
      .eq('fairId', fairId);
    
    if (error) await handleSupabaseError(error, OperationType.LIST, 'evaluation_criteria');
    return data as EvaluationCriteria[];
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
    
    // Support mock user
    const mockUserStr = localStorage.getItem('dev_user');
    const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
    const userId = user?.id || mockUser?.id;
    const isMockId = userId === '00000000-0000-0000-0000-000000000000' || userId === 'dev-admin-id';
    const dbUserId = isMockId ? null : userId;

    const { data: profile } = await supabase.from('users').select('institutionId').eq('uid', userId).maybeSingle();

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        ...data,
        creatorId: dbUserId,
        institutionId: profile?.institutionId || 'default-inst',
        status: 'submetido'
      })
      .select()
      .single();

    if (error) await handleSupabaseError(error, OperationType.CREATE, 'projects');
    
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

    if (error) await handleSupabaseError(error, OperationType.UPDATE, 'projects');

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
  },

  getProjectVersions: async (projectId: string) => {
    const { data, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('projectId', projectId)
      .order('version_number', { ascending: false });
    
    if (error) await handleSupabaseError(error, OperationType.LIST, 'project_versions');
    return data as ProjectVersion[];
  }
};

export const evaluationsService = {
  submitEvaluation: async (data: Partial<Evaluation>) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Support mock user
    const mockUserStr = localStorage.getItem('dev_user');
    const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
    const userId = user?.id || mockUser?.id;
    const isMockId = userId === '00000000-0000-0000-0000-000000000000' || userId === 'dev-admin-id';
    const dbUserId = isMockId ? null : userId;

    const { data: newEval, error } = await supabase
      .from('evaluations')
      .insert({
        ...data,
        evaluatorId: dbUserId,
        status: 'finalizado'
      })
      .select()
      .single();

    if (error) await handleSupabaseError(error, OperationType.CREATE, 'evaluations');
    if (newEval) await logAction('SUBMIT_EVALUATION', 'evaluations', newEval.id, null, newEval);
    return newEval as Evaluation;
  },

  getEvaluatorStats: async (evaluatorId: string) => {
    // In a real scenario, we'd have an assignments table. 
    // For now, we'll count evaluations created by this user.
    const { data, error } = await supabase
      .from('evaluations')
      .select('*')
      .eq('evaluatorId', evaluatorId);
    
    if (error) await handleSupabaseError(error, OperationType.LIST, 'evaluations');
    
    const completed = data?.filter(e => e.status === 'finalizado').length || 0;
    const drafts = data?.filter(e => e.status === 'rascunho').length || 0;
    
    // Calculate average score
    let totalScore = 0;
    let scoreCount = 0;
    data?.forEach(e => {
      if (e.status === 'finalizado') {
        const scores = Object.values(e.scores) as number[];
        if (scores.length > 0) {
          totalScore += scores.reduce((a, b) => a + b, 0) / scores.length;
          scoreCount++;
        }
      }
    });

    return {
      completed,
      drafts,
      avgScore: scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : '0.0'
    };
  }
};

export const usersService = {
  subscribeToUsers: (callback: (users: any[]) => void) => {
    supabase.from('users').select('*').then(({ data, error }) => {
      if (error) handleSupabaseError(error, OperationType.LIST, 'users');
      if (data) callback(data);
    });

    const subscription = supabase
      .channel('users_changes')
      .on('postgres_changes' as any, { event: '*', table: 'users' }, async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (error) handleSupabaseError(error, OperationType.LIST, 'users');
        if (data) callback(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }
};
