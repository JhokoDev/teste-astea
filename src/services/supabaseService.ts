import { supabase } from '../supabase';
import { Fair, Project, Evaluation, AuditLog, ProjectVersion, EvaluationCriteria } from '../types';
import { safeRequest, RealtimeEvent, ApiResponse } from '../lib/api-utils';

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
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Support mock user
    const mockUserStr = localStorage.getItem('dev_user');
    const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
    const userId = user?.id || mockUser?.id;
    
    if (!userId) return;

    // For database foreign keys to auth.users, we must use a real UUID or null
    const isMockId = userId?.startsWith('00000000') || 
                     userId?.startsWith('11111111') || 
                     userId?.startsWith('22222222') || 
                     userId === 'dev-admin-id';
    const dbUserId = isMockId ? null : userId;

    // Get user's institution
    const { data: profile } = await supabase
      .from('users')
      .select('institution_id')
      .eq('uid', userId)
      .maybeSingle();

    await supabase.from('audit_logs').insert({
      user_id: dbUserId,
      action,
      target_table: table,
      target_id: id,
      old_data: oldData,
      new_data: newData,
      institution_id: profile?.institution_id
    });
  } catch (error) {
    console.warn('Silent failure in logAction:', error);
  }
}

// Service methods
export const fairsService = {
  subscribeToFairs: (onEvent: (event: RealtimeEvent<Fair>) => void) => {
    const fetchInitial = async () => {
      const { data, error } = await safeRequest<Fair[]>(supabase.from('fairs').select('*'));
      if (error) {
        console.error('Error fetching initial fairs:', error);
        return;
      }
      if (data) {
        onEvent({ type: 'INITIAL', data });
      }
    };

    fetchInitial();

    const subscription = supabase
      .channel('fairs_changes')
      .on('postgres_changes' as any, { event: '*', table: 'fairs' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          onEvent({ type: 'INSERT', newItem: payload.new as Fair });
        } else if (payload.eventType === 'UPDATE') {
          onEvent({ type: 'UPDATE', newItem: payload.new as Fair, oldItem: payload.old as Fair });
        } else if (payload.eventType === 'DELETE') {
          onEvent({ type: 'DELETE', oldItem: payload.old as Fair });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  createFair: async (data: Partial<Fair>): Promise<ApiResponse<Fair>> => {
    // Sanitize data to remove fields that are now in 'structure'
    const { location_type, target_audience, ...sanitizedData } = data as any;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const mockUserStr = localStorage.getItem('dev_user');
    const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
    const userId = user?.id || mockUser?.id;
    
    const isMockId = userId?.startsWith('00000000') || 
                     userId?.startsWith('11111111') || 
                     userId?.startsWith('22222222') || 
                     userId === 'dev-admin-id';
    const dbUserId = isMockId ? null : userId;

    // Get user's institution
    let institutionId = 'default-inst';
    if (userId) {
      const { data: profile } = await supabase
        .from('users')
        .select('institution_id')
        .eq('uid', userId)
        .maybeSingle();
      
      if (profile) {
        institutionId = profile.institution_id;
      }
    }

    const response = await safeRequest<Fair>(
      supabase
        .from('fairs')
        .insert({
          ...sanitizedData,
          organizer_id: dbUserId,
          institution_id: institutionId
        })
        .select()
        .single()
    );

    if (response.data) {
      await logAction('CREATE_FAIR', 'fairs', response.data.id, null, response.data);
    }
    return response;
  },

  updateFair: async (id: string, data: Partial<Fair>): Promise<ApiResponse<Fair>> => {
    const { data: oldFair } = await supabase.from('fairs').select('*').eq('id', id).single();
    
    const { location_type, target_audience, ...sanitizedData } = data as any;
    
    const response = await safeRequest<Fair>(
      supabase
        .from('fairs')
        .update(sanitizedData)
        .eq('id', id)
        .select()
        .single()
    );

    if (response.data) {
      await logAction('UPDATE_FAIR', 'fairs', id, oldFair, response.data);
    }
    return response;
  },

  applyAsEvaluator: async (fairId: string): Promise<ApiResponse<any>> => {
    const { data: { user } } = await supabase.auth.getUser();
    const mockUserStr = localStorage.getItem('dev_user');
    const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
    const userId = user?.id || mockUser?.id;
    
    if (!userId) return { data: null, error: { message: 'User not authenticated' } };

    const { data: profile } = await supabase.from('users').select('institution_id').eq('uid', userId).maybeSingle();

    const response = await safeRequest<any>(
      supabase
        .from('evaluator_applications')
        .insert({
          fair_id: fairId,
          user_id: userId,
          status: 'pendente'
        })
        .select()
        .single()
    );

    if (response.data) {
      await logAction('APPLY_AS_EVALUATOR', 'evaluator_applications', response.data.id, null, response.data);
    }
    return response;
  },

  checkEvaluatorApplication: async (fairId: string, userId: string): Promise<ApiResponse<any>> => {
    const isMockId = userId?.startsWith('00000000') || 
                     userId?.startsWith('11111111') || 
                     userId?.startsWith('22222222') || 
                     userId === 'dev-admin-id';

    let query = supabase
      .from('evaluator_applications')
      .select('id')
      .eq('fair_id', fairId);
    
    if (isMockId) {
      query = query.is('user_id', null);
    } else {
      query = query.eq('user_id', userId);
    }

    return safeRequest<any>(query.maybeSingle());
  },

  getProjectCounts: async (): Promise<ApiResponse<any[]>> => {
    return safeRequest<any[]>(
      supabase
        .from('projects')
        .select('fair_id')
    );
  },

  getEvaluationCriteria: async (fairId: string): Promise<ApiResponse<EvaluationCriteria[]>> => {
    return safeRequest<EvaluationCriteria[]>(
      supabase
        .from('evaluation_criteria')
        .select('*')
        .eq('fair_id', fairId)
    );
  }
};

export const settingsService = {
  getInstitutionSettings: async (institutionId: string): Promise<ApiResponse<any>> => {
    return safeRequest<any>(
      supabase
        .from('institutions')
        .select('settings')
        .eq('id', institutionId)
        .maybeSingle()
    );
  },

  updateInstitutionSettings: async (institutionId: string, settings: any): Promise<ApiResponse<any>> => {
    const { data: oldInst } = await supabase.from('institutions').select('*').eq('id', institutionId).single();
    const response = await safeRequest<any>(
      supabase
        .from('institutions')
        .update({ settings })
        .eq('id', institutionId)
        .select()
        .single()
    );

    if (response.data) {
      await logAction('UPDATE_INSTITUTION_SETTINGS', 'institutions', institutionId, oldInst, response.data);
    }
    return response;
  },

  getAuditLogs: async (limit: number = 5): Promise<ApiResponse<any[]>> => {
    return safeRequest<any[]>(
      supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit)
    );
  },

  subscribeToAuditLogs: (onEvent: (event: RealtimeEvent<any>) => void) => {
    const subscription = supabase
      .channel('audit_logs_changes')
      .on('postgres_changes' as any, { event: 'INSERT', table: 'audit_logs' }, (payload: any) => {
        onEvent({ type: 'INSERT', newItem: payload.new });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }
};

export const projectsService = {
  subscribeToProjects: (onEvent: (event: RealtimeEvent<Project>) => void) => {
    const mapProject = (p: any): Project => ({
      ...p,
      category: p.category || p.custom_data?.category || '',
      modality: p.modality || p.custom_data?.modality || ''
    });

    const fetchInitial = async () => {
      const { data, error } = await safeRequest<Project[]>(supabase.from('projects').select('*'));
      if (error) {
        console.error('Error fetching initial projects:', error);
        return;
      }
      if (data) {
        onEvent({ type: 'INITIAL', data: data.map(mapProject) });
      }
    };

    fetchInitial();

    const subscription = supabase
      .channel('projects_changes')
      .on('postgres_changes' as any, { event: '*', table: 'projects' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          onEvent({ type: 'INSERT', newItem: mapProject(payload.new) });
        } else if (payload.eventType === 'UPDATE') {
          onEvent({ type: 'UPDATE', newItem: mapProject(payload.new), oldItem: mapProject(payload.old) });
        } else if (payload.eventType === 'DELETE') {
          onEvent({ type: 'DELETE', oldItem: mapProject(payload.old) });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  submitProject: async (data: Partial<Project>): Promise<ApiResponse<Project>> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const mockUserStr = localStorage.getItem('dev_user');
    const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
    const userId = user?.id || mockUser?.id;
    
    if (!userId) return { data: null, error: { message: 'User not authenticated' } };

    const { data: profile } = await supabase.from('users').select('institution_id').eq('uid', userId).maybeSingle();

    const response = await safeRequest<Project>(
      supabase.rpc('create_project_with_version', {
        p_title: data.title,
        p_abstract: data.abstract,
        p_category: data.category || '',
        p_modality: data.modality || '',
        p_fair_id: data.fair_id,
        p_institution_id: profile?.institution_id || 'default-inst',
        p_creator_id: userId,
        p_members: data.members || [],
        p_evidence: data.evidence || { files: [], links: [] },
        p_custom_data: data.custom_data || {}
      })
    );

    if (response.data) {
      await logAction('SUBMIT_PROJECT', 'projects', response.data.id, null, response.data);
    }

    return response;
  },

  updateProject: async (id: string, data: Partial<Project>, justification?: string): Promise<ApiResponse<Project>> => {
    const { data: oldProject } = await supabase.from('projects').select('*').eq('id', id).single();
    const { data: { user } } = await supabase.auth.getUser();
    const mockUserStr = localStorage.getItem('dev_user');
    const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
    const userId = user?.id || mockUser?.id || '00000000-0000-0000-0000-000000000000';

    const newVersionNumber = (oldProject?.current_version || 1) + 1;

    const response = await safeRequest<Project>(
      supabase
        .from('projects')
        .update({
          ...data,
          current_version: newVersionNumber
        })
        .eq('id', id)
        .select()
        .single()
    );

    if (response.data) {
      // Create new version (RF06)
      const { error: versionError } = await supabase.from('project_versions').insert({
        project_id: id,
        version_number: newVersionNumber,
        data: response.data,
        created_by: userId
      });

      if (versionError) {
        console.warn('supabaseService: Error creating project version update:', versionError);
      }

      await logAction('UPDATE_PROJECT', 'projects', id, { ...oldProject, justification }, response.data);
    }

    return response;
  },

  getProjectVersions: async (projectId: string): Promise<ApiResponse<ProjectVersion[]>> => {
    return safeRequest<ProjectVersion[]>(
      supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
    );
  }
};

export const evaluationsService = {
  submitEvaluation: async (data: Partial<Evaluation>): Promise<ApiResponse<Evaluation>> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const mockUserStr = localStorage.getItem('dev_user');
    const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
    const userId = user?.id || mockUser?.id;
    
    if (!userId) return { data: null, error: { message: 'User not authenticated' } };

    const response = await safeRequest<Evaluation>(
      supabase
        .from('evaluations')
        .insert({
          ...data,
          evaluator_id: userId,
          status: 'finalizado'
        })
        .select()
        .single()
    );

    if (response.data) {
      await logAction('SUBMIT_EVALUATION', 'evaluations', response.data.id, null, response.data);
    }
    return response;
  },

  getEvaluatorStats: async (evaluatorId: string): Promise<ApiResponse<{ completed: number; drafts: number; avgScore: string; total: number; }>> => {
    const response = await safeRequest<Evaluation[]>(
      supabase
        .from('evaluations')
        .select('*')
        .eq('evaluator_id', evaluatorId)
    );

    if (response.error || !response.data) {
      return { data: { completed: 0, drafts: 0, avgScore: '0.0', total: 0 }, error: response.error };
    }

    const data = response.data;
    const completed = data.filter(e => e.status === 'finalizado').length;
    const drafts = data.filter(e => e.status === 'rascunho').length;
    
    let totalScore = 0;
    let scoreCount = 0;
    data.forEach(e => {
      if (e.status === 'finalizado') {
        const scores = Object.values(e.scores) as number[];
        if (scores.length > 0) {
          totalScore += scores.reduce((a, b) => a + b, 0) / scores.length;
          scoreCount++;
        }
      }
    });

    return {
      data: {
        completed,
        drafts,
        avgScore: scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : '0.0',
        total: completed + drafts
      },
      error: null
    };
  },

  getEvaluatorApplications: async (filters: { user_id?: string; status?: string; institution_id?: string }): Promise<ApiResponse<any[]>> => {
    let query = supabase
      .from('evaluator_applications')
      .select(`
        *,
        fair:fairs!fair_id(name)
      `);
      
    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.status) query = query.eq('status', filters.status);
    
    const response = await safeRequest<any[]>(query);
    
    if (response.data && response.data.length > 0) {
      // Filter by institution_id in memory if needed
      if (filters.institution_id) {
        response.data = response.data.filter(app => 
          app.institution_id === filters.institution_id || 
          (app.fair && app.fair.institution_id === filters.institution_id)
        );
      }

      // Fetch users manually since we can't use a foreign key due to type mismatch (text vs uuid)
      const userIds = response.data.map(app => app.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .in('uid', userIds);
          
        if (users) {
          const userMap = users.reduce((acc, user) => {
            acc[user.uid] = {
              ...user,
              display_name: user?.display_name || user?.name || user?.displayName || user?.displayname
            };
            return acc;
          }, {} as Record<string, any>);
          
          response.data = response.data.map(app => ({
            ...app,
            user: userMap[app.user_id] || null
          }));
        }
      }
    }
    
    return response;
  },

  updateEvaluatorApplicationStatus: async (applicationId: string, status: 'aprovado' | 'rejeitado'): Promise<ApiResponse<any>> => {
    const { data: oldApp } = await supabase.from('evaluator_applications').select('*').eq('id', applicationId).single();
    const response = await safeRequest<any>(
      supabase
        .from('evaluator_applications')
        .update({ status })
        .eq('id', applicationId)
        .select()
        .single()
    );

    if (response.data) {
      await logAction('UPDATE_EVALUATOR_APPLICATION', 'evaluator_applications', applicationId, oldApp, response.data);
      
      // If approved, also update the user role to evaluator if it's not already
      if (status === 'aprovado') {
        const uid = response.data.user_id || response.data.userId || response.data.userid;
        if (uid) {
          await supabase.from('users').update({ role: 'evaluator' }).eq('uid', uid);
        }
      }
    }
    return response;
  },

  getAssignedProjects: async (userId: string): Promise<ApiResponse<Project[]>> => {
    // Get fairs where user is approved evaluator
    const { data: apps, error: appsError } = await safeRequest<any[]>(
      supabase
        .from('evaluator_applications')
        .select('fair_id')
        .eq('user_id', userId)
        .eq('status', 'aprovado')
    );

    if (appsError || !apps) return { data: [], error: appsError };

    const fairIds = apps.map(a => a.fair_id);
    if (fairIds.length === 0) return { data: [], error: null };

    return safeRequest<Project[]>(
      supabase
        .from('projects')
        .select('*')
        .in('fair_id', fairIds)
        .neq('creator_id', userId)
    );
  }
};

export const usersService = {
  getUsers: async (filters: { role?: string; institution_id?: string }): Promise<ApiResponse<any[]>> => {
    let query = supabase.from('users').select('*');
    if (filters.institution_id) query = query.eq('institution_id', filters.institution_id);
    
    // If filtering by role = 'evaluator', we should also include users who have an approved application
    // but their role wasn't updated due to a bug.
    if (filters.role && filters.role !== 'evaluator') {
      query = query.eq('role', filters.role);
    }
    
    const response = await safeRequest<any[]>(query);
    
    if (response.data) {
      if (filters.role === 'evaluator') {
        const { data: approvedApps } = await supabase.from('evaluator_applications').select('*').eq('status', 'aprovado');
        const approvedUserIds = new Set(approvedApps?.map(app => app.user_id || app.userId || app.userid).filter(Boolean) || []);
        
        response.data = response.data.filter(user => user.role === 'evaluator' || approvedUserIds.has(user.uid));
        
        // Fix role in memory and background
        response.data.forEach(user => {
          if (approvedUserIds.has(user.uid) && user.role !== 'evaluator') {
            user.role = 'evaluator';
            supabase.from('users').update({ role: 'evaluator' }).eq('uid', user.uid).then();
          }
        });
      }
      
      response.data = response.data.map(user => ({
        ...user,
        display_name: user?.display_name || user?.name || user?.displayName || user?.displayname
      }));
      response.data.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
    }
    return response;
  },

  updateUserRole: async (userId: string, newRole: string): Promise<ApiResponse<any>> => {
    const { data: oldUser } = await supabase.from('users').select('*').eq('uid', userId).single();
    const response = await safeRequest<any>(
      supabase
        .from('users')
        .update({ role: newRole })
        .eq('uid', userId)
        .select()
        .single()
    );

    if (response.data) {
      await logAction('UPDATE_USER_ROLE', 'users', userId, oldUser, response.data);
    }
    return response;
  },

  getProfile: async (userId: string): Promise<ApiResponse<any>> => {
    const response = await safeRequest<any>(
      supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .maybeSingle()
    );
    if (response.data) {
      response.data.display_name = response.data?.display_name || response.data?.name || response.data?.displayName || response.data?.displayname;
      response.data.photo_url = response.data?.photo_url || response.data?.photoURL || response.data?.photourl;
    }
    return response;
  },

  updateProfile: async (userId: string, updates: any): Promise<ApiResponse<any>> => {
    const { data: oldProfile } = await supabase.from('users').select('*').eq('uid', userId).single();
    
    const dbUpdates = { ...updates };
    
    if (oldProfile) {
      if ('display_name' in dbUpdates) {
        if ('displayName' in oldProfile) dbUpdates.displayName = dbUpdates.display_name;
        else if ('displayname' in oldProfile) dbUpdates.displayname = dbUpdates.display_name;
        else if ('name' in oldProfile) dbUpdates.name = dbUpdates.display_name;
        
        if (!('display_name' in oldProfile)) delete dbUpdates.display_name;
      }
      
      if ('photo_url' in dbUpdates) {
        if ('photoURL' in oldProfile) dbUpdates.photoURL = dbUpdates.photo_url;
        else if ('photourl' in oldProfile) dbUpdates.photourl = dbUpdates.photo_url;
        
        if (!('photo_url' in oldProfile)) delete dbUpdates.photo_url;
      }
    }

    const response = await safeRequest<any>(
      supabase
        .from('users')
        .update(dbUpdates)
        .eq('uid', userId)
        .select()
        .single()
    );

    if (response.data) {
      response.data.display_name = response.data?.display_name || response.data?.name || response.data?.displayName || response.data?.displayname;
      response.data.photo_url = response.data?.photo_url || response.data?.photoURL || response.data?.photourl;
      await logAction('UPDATE_PROFILE', 'users', userId, oldProfile, response.data);
    }
    return response;
  },

  subscribeToUsers: (onEvent: (event: RealtimeEvent<any>) => void) => {
    const fetchInitial = async () => {
      const { data, error } = await safeRequest<any[]>(supabase.from('users').select('*'));
      if (error) {
        console.error('Error fetching initial users:', error);
        return;
      }
      if (data) {
        const mappedData = data.map(user => ({
          ...user,
          display_name: user?.display_name || user?.name || user?.displayName || user?.displayname
        }));
        onEvent({ type: 'INITIAL', data: mappedData });
      }
    };

    fetchInitial();

    const subscription = supabase
      .channel('users_changes')
      .on('postgres_changes' as any, { event: '*', table: 'users' }, (payload: any) => {
        const mapUser = (user: any) => ({
          ...user,
          display_name: user?.name || user?.display_name
        });
        if (payload.eventType === 'INSERT') {
          onEvent({ type: 'INSERT', newItem: mapUser(payload.new) });
        } else if (payload.eventType === 'UPDATE') {
          onEvent({ type: 'UPDATE', newItem: mapUser(payload.new), oldItem: mapUser(payload.old) });
        } else if (payload.eventType === 'DELETE') {
          onEvent({ type: 'DELETE', oldItem: mapUser(payload.old) });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }
};
