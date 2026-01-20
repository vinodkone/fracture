import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazily initialized Supabase client
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY environment variables.'
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseSecretKey);
  return supabaseClient;
}

// Export a proxy that lazily initializes the client on first access
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseClient();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    // Bind functions to the client
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// Database types for TypeScript
export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  google_id: string;
  linked_member_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface DbMember {
  id: string;
  name: string;
  created_at: string;
}

export interface DbGroup {
  id: string;
  name: string;
  member_ids: string[];
  created_at: string;
}

export interface DbExpense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  paid_by_member_id: string;
  split_type: string;
  split_details: { memberId: string; value: number }[];
  created_at: string;
}

export interface DbSettlement {
  id: string;
  group_id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  created_at: string;
}
