export type ApiResponse<T> = {
  data: T | null;
  error: { message: string; code?: string } | null;
};

export type RealtimeEvent<T> = 
  | { type: 'INITIAL'; data: T[] }
  | { type: 'INSERT'; newItem: T }
  | { type: 'UPDATE'; newItem: T; oldItem: T }
  | { type: 'DELETE'; oldItem: T };

export async function safeRequest<T>(request: Promise<any>): Promise<ApiResponse<T>> {
  try {
    const { data, error } = await request;
    if (error) {
      console.error('API Error:', error);
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data, error: null };
  } catch (err: any) {
    console.error('Unexpected Error:', err);
    return { data: null, error: { message: err.message || 'Erro inesperado' } };
  }
}
