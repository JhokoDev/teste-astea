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
      .select('institutionid')
      .eq('uid', userId)
      .maybeSingle();

    await supabase.from('audit_logs').insert({
      userid: dbUserId,
      action,
      targettable: table,
      targetid: id,
      olddata: oldData,
      newdata: newData,
      institutionid: profile?.institutionid
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
        .select('institutionid')
        .eq('uid', userId)
        .maybeSingle();
      
      if (profile) {
        institutionId = profile.institutionid;
      }
    }

    const response = await safeRequest<Fair>(
      supabase
        .from('fairs')
        .insert({
          ...data,
          organizerid: dbUserId,
          institutionid: institutionId
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
    
    const response = await safeRequest<Fair>(
      supabase
        .from('fairs')
        .update(data)
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

    const response = await safeRequest<any>(
      supabase
        .from('evaluator_applications')
        .insert({
          fairid: fairId,
          userid: userId,
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
      .eq('fairid', fairId);
    
    if (isMockId) {
      query = query.is('userid', null);
    } else {
      query = query.eq('userid', userId);
    }

    return safeRequest<any>(query.maybeSingle());
  },

  getProjectCounts: async (): Promise<ApiResponse<any[]>> => {
    return safeRequest<any[]>(
      supabase
        .from('projects')
        .select('fairid')
    );
  },

  getEvaluationCriteria: async (fairId: string): Promise<ApiResponse<EvaluationCriteria[]>> => {
    return safeRequest<EvaluationCriteria[]>(
      supabase
        .from('evaluation_criteria')
        .select('*')
        .eq('fairid', fairId)
    );
  },

  joinFair: async (fairId: string, role: 'advisor' | 'participant'): Promise<ApiResponse<any>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    const response = await safeRequest<any>(
      supabase
        .from('fair_participants')
        .insert({
          fairid: fairId,
          userid: user.id,
          role
        })
        .select()
        .single()
    );

    if (response.data) {
      await logAction('JOIN_FAIR', 'fair_participants', response.data.id, null, response.data);
    }
    return response;
  },

  getFairParticipation: async (fairId: string, userId: string): Promise<ApiResponse<any>> => {
    return safeRequest<any>(
      supabase
        .from('fair_participants')
        .select('*')
        .eq('fairid', fairId)
        .eq('userid', userId)
        .maybeSingle()
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
        .select('*, users:userid(displayname)')
        .order('createdat', { ascending: false })
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
    const fetchInitial = async () => {
      const { data, error } = await safeRequest<Project[]>(supabase.from('projects').select('*'));
      if (error) {
        console.error('Error fetching initial projects:', error);
        return;
      }
      if (data) {
        onEvent({ type: 'INITIAL', data });
      }
    };

    fetchInitial();

    const subscription = supabase
      .channel('projects_changes')
      .on('postgres_changes' as any, { event: '*', table: 'projects' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          onEvent({ type: 'INSERT', newItem: payload.new as Project });
        } else if (payload.eventType === 'UPDATE') {
          onEvent({ type: 'UPDATE', newItem: payload.new as Project, oldItem: payload.old as Project });
        } else if (payload.eventType === 'DELETE') {
          onEvent({ type: 'DELETE', oldItem: payload.old as Project });
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

    const { data: profile } = await supabase.from('users').select('institutionid').eq('uid', userId).maybeSingle();

    const response = await safeRequest<Project>(
      supabase.rpc('create_project_with_version', {
        p_title: data.title,
        p_abstract: data.abstract,
        p_category: data.category || '',
        p_modality: data.modality || '',
        p_fairid: data.fairid,
        p_institutionid: profile?.institutionid || 'default-inst',
        p_creatorid: userId,
        p_members: data.members || [],
        p_evidence: data.evidence || { files: [], links: [] },
        p_customdata: data.customdata || {}
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

    const newVersionNumber = (oldProject?.currentversion || 1) + 1;

    const response = await safeRequest<Project>(
      supabase
        .from('projects')
        .update({
          ...data,
          currentversion: newVersionNumber
        })
        .eq('id', id)
        .select()
        .single()
    );

    if (response.data) {
      // Create new version (RF06)
      const { error: versionError } = await supabase.from('project_versions').insert({
        projectid: id,
        versionnumber: newVersionNumber,
        data: response.data,
        createdby: userId
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
        .eq('projectid', projectId)
        .order('versionnumber', { ascending: false })
    );
  },

  addProjectAdvisor: async (projectId: string, email: string): Promise<ApiResponse<any>> => {
    // Check if user with this email exists
    const { data: user } = await supabase.from('users').select('uid').eq('email', email).maybeSingle();
    
    const response = await safeRequest<any>(
      supabase
        .from('project_advisors')
        .insert({
          projectid: projectId,
          advisor_email: email,
          advisor_userid: user?.uid || null,
          status: 'pending'
        })
        .select()
        .single()
    );

    if (response.data) {
      await logAction('ADD_PROJECT_ADVISOR', 'project_advisors', response.data.id, null, response.data);
      // TODO: Send confirmation email
    }
    return response;
  },

  getProjectAdvisors: async (projectId: string): Promise<ApiResponse<any[]>> => {
    return safeRequest<any[]>(
      supabase
        .from('project_advisors')
        .select('*, users:advisor_userid(displayname, photourl)')
        .eq('projectid', projectId)
    );
  },

  getAdvisorProjects: async (userId: string): Promise<ApiResponse<Project[]>> => {
    // Get projects where user is a confirmed advisor
    const { data: advisorLinks } = await safeRequest<any[]>(
      supabase
        .from('project_advisors')
        .select('projectid')
        .eq('advisor_userid', userId)
        .eq('status', 'confirmed')
    );

    if (!advisorLinks || advisorLinks.length === 0) return { data: [], error: null };

    const projectIds = advisorLinks.map(link => link.projectid);
    
    return safeRequest<Project[]>(
      supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
    );
  },

  updateAdvisorStatus: async (linkId: string, status: 'confirmed' | 'rejected'): Promise<ApiResponse<any>> => {
    const { data: oldLink } = await supabase.from('project_advisors').select('*').eq('id', linkId).single();
    const response = await safeRequest<any>(
      supabase
        .from('project_advisors')
        .update({ status })
        .eq('id', linkId)
        .select()
        .single()
    );

    if (response.data) {
      await logAction('UPDATE_ADVISOR_STATUS', 'project_advisors', linkId, oldLink, response.data);
    }
    return response;
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
          evaluatorid: userId,
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
        .eq('evaluatorid', evaluatorId)
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

  getEvaluatorApplications: async (filters: { userid?: string; status?: string; institutionid?: string }): Promise<ApiResponse<any[]>> => {
    let query = supabase
      .from('evaluator_applications')
      .select('*');
      
    if (filters.userid) query = query.eq('userid', filters.userid);
    if (filters.status) query = query.eq('status', filters.status);
    
    const response = await safeRequest<any[]>(query);
    
    if (response.data && response.data.length > 0) {
      // 1. Fetch Fairs manually
      const fairIds = response.data.map(app => app.fairid).filter(Boolean);
      let fairMap: Record<string, any> = {};
      if (fairIds.length > 0) {
        const { data: fairs } = await supabase.from('fairs').select('id, name, institutionid').in('id', fairIds);
        if (fairs) {
          fairMap = fairs.reduce((acc, fair) => {
            acc[fair.id] = fair;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // 2. Map fair info
      response.data = response.data.map(app => ({
        ...app,
        fair: fairMap[app.fairid] || null
      }));

      // Filter by institutionid in memory if needed
      if (filters.institutionid) {
        response.data = response.data.filter(app => 
          app.institutionid === filters.institutionid || 
          (app.fair && app.fair.institutionid === filters.institutionid)
        );
      }

      // Fetch users manually since we can't use a foreign key due to type mismatch (text vs uuid)
      const userIds = response.data.map(app => app.userid).filter(Boolean);
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .in('uid', userIds);
          
        if (users) {
          const userMap = users.reduce((acc, user) => {
            acc[user.uid] = user;
            return acc;
          }, {} as Record<string, any>);
          
          response.data = response.data.map(app => ({
            ...app,
            user: userMap[app.userid] || null
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
        const uid = response.data.userid;
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
        .select('fairid')
        .eq('userid', userId)
        .eq('status', 'aprovado')
    );

    if (appsError || !apps) return { data: [], error: appsError };

    const fairIds = apps.map(a => a.fairid);
    if (fairIds.length === 0) return { data: [], error: null };

    return safeRequest<Project[]>(
      supabase
        .from('projects')
        .select('*')
        .in('fairid', fairIds)
        .neq('creatorid', userId)
    );
  }
};

export const usersService = {
  getUsers: async (filters: { role?: string; institutionid?: string }): Promise<ApiResponse<any[]>> => {
    let query = supabase.from('users').select('*');
    if (filters.institutionid) query = query.eq('institutionid', filters.institutionid);
    
    // If filtering by role = 'evaluator', we should also include users who have an approved application
    // but their role wasn't updated due to a bug.
    if (filters.role && filters.role !== 'evaluator') {
      query = query.eq('role', filters.role);
    }
    
    const response = await safeRequest<any[]>(query);
    
    if (response.data) {
      if (filters.role === 'evaluator') {
        const { data: approvedApps } = await supabase.from('evaluator_applications').select('*').eq('status', 'aprovado');
        const approvedUserIds = new Set(approvedApps?.map(app => (app.userid || app.userId)?.toString()).filter(Boolean) || []);
        
        response.data = response.data.filter(user => user.role === 'evaluator' || approvedUserIds.has(user.uid?.toString()));
        
        // Fix role in memory and background
        response.data.forEach(user => {
          if (approvedUserIds.has(user.uid?.toString()) && user.role !== 'evaluator') {
            user.role = 'evaluator';
            supabase.from('users').update({ role: 'evaluator' }).eq('uid', user.uid).then();
          }
        });
      }
      
      response.data.sort((a, b) => (a.displayname || '').localeCompare(b.displayname || ''));
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
    return safeRequest<any>(
      supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .maybeSingle()
    );
  },

  updateProfile: async (userId: string, updates: any): Promise<ApiResponse<any>> => {
    const { data: oldProfile } = await supabase.from('users').select('*').eq('uid', userId).single();
    
    const response = await safeRequest<any>(
      supabase
        .from('users')
        .update(updates)
        .eq('uid', userId)
        .select()
        .single()
    );

    if (response.data) {
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
        onEvent({ type: 'INITIAL', data });
      }
    };

    fetchInitial();

    const subscription = supabase
      .channel('users_changes')
      .on('postgres_changes' as any, { event: '*', table: 'users' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          onEvent({ type: 'INSERT', newItem: payload.new });
        } else if (payload.eventType === 'UPDATE') {
          onEvent({ type: 'UPDATE', newItem: payload.new, oldItem: payload.old });
        } else if (payload.eventType === 'DELETE') {
          onEvent({ type: 'DELETE', oldItem: payload.old });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }
};
