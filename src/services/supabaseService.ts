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
  // Handle all mock IDs
  const isMockId = userId.startsWith('00000000') || 
                   userId.startsWith('11111111') || 
                   userId.startsWith('22222222') || 
                   userId === 'dev-admin-id';
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
    // Handle all mock IDs
    const isMockId = userId?.startsWith('00000000') || 
                     userId?.startsWith('11111111') || 
                     userId?.startsWith('22222222') || 
                     userId === 'dev-admin-id';
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
    
    if (!userId) throw new Error('User not authenticated');

    const { data: profile } = await supabase.from('users').select('institutionId').eq('uid', userId).maybeSingle();

    const { data: application, error } = await supabase
      .from('evaluator_applications')
      .insert({
        fairId,
        userId: userId, // Use the ID directly (mock or real) since column is text
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
    const mapProject = (p: any): Project => ({
      ...p,
      category: p.category || p.custom_data?.category || '',
      modality: p.modality || p.custom_data?.modality || ''
    });

    supabase.from('projects').select('*').then(({ data, error }) => {
      if (error) handleSupabaseError(error, OperationType.LIST, 'projects');
      if (data) callback(data.map(mapProject));
    });

    const subscription = supabase
      .channel('projects_changes')
      .on('postgres_changes' as any, { event: '*', table: 'projects' }, async () => {
        const { data, error } = await supabase.from('projects').select('*');
        if (error) handleSupabaseError(error, OperationType.LIST, 'projects');
        if (data) callback(data.map(mapProject));
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
    
    if (!userId) throw new Error('User not authenticated');

    const { data: profile } = await supabase.from('users').select('institutionId').eq('uid', userId).maybeSingle();

    // Sanitize data for projects table (move category/modality to custom_data if needed)
    const { category, modality, fairId, ...rest } = data as any;
    
    // We'll prepare the data with category/modality at top level AND in custom_data
    // This way it works with both old and new schemas
    // Also handle fairId mapping
    const sanitizedData: any = {
      ...rest,
      fairId: fairId,
      category: category || '',
      modality: modality || '',
      custom_data: {
        ...(data.custom_data || {}),
        category,
        modality
      }
    };

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        ...sanitizedData,
        creatorId: userId,
        institutionId: profile?.institutionId || 'default-inst',
        status: 'submetido'
      })
      .select()
      .single();

    // If the error is about missing columns, try a more basic insert
    if (error && (error.message.includes('custom_data') || error.message.includes('category') || error.message.includes('modality') || error.message.includes('fairId'))) {
      console.warn('supabaseService: Missing columns detected, retrying with basic schema...');
      const { custom_data, category: c, modality: m, fairId: f, ...basicData } = sanitizedData;
      const { data: retryProject, error: retryError } = await supabase
        .from('projects')
        .insert({
          ...basicData,
          fairId: fairId, // Still need this as it's a foreign key
          creatorId: userId,
          institutionId: profile?.institutionId || 'default-inst',
          status: 'submetido'
        })
        .select()
        .single();
      
      if (retryError) await handleSupabaseError(retryError, OperationType.CREATE, 'projects');
      return retryProject as Project;
    }

    if (error) await handleSupabaseError(error, OperationType.CREATE, 'projects');
    
    // Create first version (RF06)
    if (newProject) {
      const { error: versionError } = await supabase.from('project_versions').insert({
        projectId: newProject.id,
        version_number: 1,
        data: newProject,
        createdBy: userId
      });
      
      if (versionError) {
        console.warn('supabaseService: Error creating project version:', versionError);
      }
      
      await logAction('SUBMIT_PROJECT', 'projects', newProject.id, null, newProject);
    }

    return newProject as Project;
  },

  updateProject: async (id: string, data: Partial<Project>, justification?: string) => {
    const { data: oldProject } = await supabase.from('projects').select('*').eq('id', id).single();
    const { data: { user } } = await supabase.auth.getUser();
    const mockUserStr = localStorage.getItem('dev_user');
    const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
    const userId = user?.id || mockUser?.id || '00000000-0000-0000-0000-000000000000';

    const newVersionNumber = (oldProject?.current_version || 1) + 1;

    // Sanitize data
    const { category, modality, fairId, ...rest } = data as any;
    const sanitizedData: any = {
      ...rest,
      fairId: fairId !== undefined ? fairId : oldProject?.fairId,
      category: category !== undefined ? category : oldProject?.category,
      modality: modality !== undefined ? modality : oldProject?.modality,
      custom_data: {
        ...(data.custom_data || oldProject?.custom_data || {}),
        category: category !== undefined ? category : oldProject?.category,
        modality: modality !== undefined ? modality : oldProject?.modality
      },
      current_version: newVersionNumber
    };

    const { data: updatedProject, error } = await supabase
      .from('projects')
      .update(sanitizedData)
      .eq('id', id)
      .select()
      .single();

    // If the error is about missing columns, try a more basic update
    if (error && (error.message.includes('custom_data') || error.message.includes('category') || error.message.includes('modality') || error.message.includes('fairId'))) {
      console.warn('supabaseService: Missing columns detected, retrying update with basic schema...');
      const { custom_data, category: c, modality: m, fairId: f, ...basicData } = sanitizedData;
      const { data: retryProject, error: retryError } = await supabase
        .from('projects')
        .update(basicData)
        .eq('id', id)
        .select()
        .single();
      
      if (retryError) await handleSupabaseError(retryError, OperationType.UPDATE, 'projects');
      if (retryProject) await logAction('UPDATE_PROJECT', 'projects', id, { ...oldProject, justification }, retryProject);
      return retryProject as Project;
    }

    if (error) await handleSupabaseError(error, OperationType.UPDATE, 'projects');

    if (updatedProject) {
      // Create new version (RF06)
      const { error: versionError } = await supabase.from('project_versions').insert({
        projectId: id,
        version_number: newVersionNumber,
        data: updatedProject,
        createdBy: userId
      });

      if (versionError) {
        console.warn('supabaseService: Error creating project version update:', versionError);
      }

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
    
    if (!userId) throw new Error('User not authenticated');

    const { data: newEval, error } = await supabase
      .from('evaluations')
      .insert({
        ...data,
        evaluatorId: userId,
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
