import { supabase } from '../supabase';

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

// Service methods
export const fairsService = {
  subscribeToFairs: (callback: (fairs: any[]) => void) => {
    // Initial fetch
    supabase.from('fairs').select('*').then(({ data, error }) => {
      if (error) handleSupabaseError(error, OperationType.LIST, 'fairs');
      if (data) callback(data);
    });

    // Real-time subscription
    const subscription = supabase
      .channel('fairs_changes')
      .on('postgres_changes' as any, { event: '*', table: 'fairs' }, async () => {
        const { data, error } = await supabase.from('fairs').select('*');
        if (error) handleSupabaseError(error, OperationType.LIST, 'fairs');
        if (data) callback(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  createFair: async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: newFair, error } = await supabase
      .from('fairs')
      .insert({
        ...data,
        organizerId: user?.id
      })
      .select()
      .single();

    if (error) handleSupabaseError(error, OperationType.CREATE, 'fairs');
    return newFair;
  }
};

export const projectsService = {
  subscribeToProjects: (callback: (projects: any[]) => void) => {
    // Initial fetch
    supabase.from('projects').select('*').then(({ data, error }) => {
      if (error) handleSupabaseError(error, OperationType.LIST, 'projects');
      if (data) callback(data);
    });

    // Real-time subscription
    const subscription = supabase
      .channel('projects_changes')
      .on('postgres_changes' as any, { event: '*', table: 'projects' }, async () => {
        const { data, error } = await supabase.from('projects').select('*');
        if (error) handleSupabaseError(error, OperationType.LIST, 'projects');
        if (data) callback(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }
};
