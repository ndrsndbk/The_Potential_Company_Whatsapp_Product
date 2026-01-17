// API client for Cloudflare Pages Functions

import { getAuthToken } from '@/contexts/AuthContext';

const API_BASE = '/api';

interface ApiError {
  error: string;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiError).error || 'API request failed');
  }

  return data as T;
}

// Flow types
export interface Flow {
  id: string;
  name: string;
  whatsapp_config_id: string | null;
  is_active: boolean;
  is_published: boolean;
  trigger_type: 'keyword' | 'any_message';
  trigger_value: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
  whatsapp_configs?: {
    id: string;
    name: string;
    phone_number: string;
  } | null;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: string;
    config: Record<string, unknown>;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

// WhatsApp Config types
export interface WhatsAppConfig {
  id: string;
  name: string;
  phone_number_id: string;
  phone_number: string;
  is_active: boolean;
  created_at: string;
}

// Flows API
export const flowsApi = {
  async list(): Promise<{ flows: Flow[] }> {
    return fetchApi('/flows');
  },

  async get(id: string): Promise<{ flow: Flow; nodes: FlowNode[]; edges: FlowEdge[] }> {
    return fetchApi(`/flows/${id}`);
  },

  async create(data: {
    name: string;
    whatsapp_config_id?: string;
    trigger_type?: string;
    trigger_value?: string;
    nodes?: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }>;
    edges?: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
    }>;
  }): Promise<{ flow: Flow }> {
    return fetchApi('/flows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      whatsapp_config_id?: string;
      trigger_type?: string;
      trigger_value?: string;
      is_active?: boolean;
      nodes?: Array<{
        id: string;
        type: string;
        position: { x: number; y: number };
        data: Record<string, unknown>;
      }>;
      edges?: Array<{
        id: string;
        source: string;
        target: string;
        sourceHandle?: string;
      }>;
    }
  ): Promise<{ flow: Flow }> {
    return fetchApi(`/flows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return fetchApi(`/flows/${id}`, {
      method: 'DELETE',
    });
  },

  async publish(id: string, publish: boolean): Promise<{ flow: Flow }> {
    return fetchApi(`/flows/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ publish }),
    });
  },
};

// WhatsApp Configs API
export const configsApi = {
  async list(): Promise<{ configs: WhatsAppConfig[] }> {
    return fetchApi('/configs');
  },

  async get(id: string): Promise<{ config: WhatsAppConfig }> {
    return fetchApi(`/configs/${id}`);
  },

  async create(data: {
    name: string;
    phone_number_id: string;
    phone_number: string;
    access_token: string;
    verify_token: string;
  }): Promise<{ config: WhatsAppConfig }> {
    return fetchApi('/configs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      phone_number_id?: string;
      phone_number?: string;
      access_token?: string;
      verify_token?: string;
      is_active?: boolean;
    }
  ): Promise<{ config: WhatsAppConfig }> {
    return fetchApi(`/configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return fetchApi(`/configs/${id}`, {
      method: 'DELETE',
    });
  },
};

// Organization types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// User types
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'super_admin' | 'org_admin' | 'user';
  organization_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization?: Organization | null;
}

// Flow Logs types
export interface FlowLog {
  id: string;
  executed_at: string;
  customer_phone: string;
  customer_name: string | null;
  status: 'completed' | 'failed' | 'in_progress';
  duration_ms: number | null;
  nodes_executed: number;
  error_message: string | null;
}

export interface FlowLogStats {
  total: number;
  completed: number;
  failed: number;
  success_rate: string;
  avg_duration_ms: number;
  unique_customers: number;
}

export interface DailyStats {
  date: string;
  executions: number;
  success: number;
  failed: number;
}

export interface FlowLogsResponse {
  logs: FlowLog[];
  stats: FlowLogStats;
  daily_stats: DailyStats[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// Flow Logs API
export const flowLogsApi = {
  async get(flowId: string, limit = 100, offset = 0): Promise<FlowLogsResponse> {
    return fetchApi(`/flows/${flowId}/logs?limit=${limit}&offset=${offset}`);
  },
};

// Flow Run types
export interface FlowRun {
  id: string;
  flow_id: string;
  flow_name: string;
  flow_version_id: string | null;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string;
  status: 'running' | 'completed' | 'failed';
  variables: Record<string, unknown>;
  current_node_id: string | null;
  started_at: string;
  completed_at: string | null;
  nodes_executed: number;
  error_message: string | null;
}

export interface FlowRunDetail {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  variables: Record<string, unknown>;
  current_node_id: string | null;
  error_message: string | null;
  flow: {
    id: string;
    name: string;
    trigger_type: string;
    trigger_value: string | null;
  };
  customer: {
    id?: string;
    phone: string;
    name: string | null;
    dob?: string | null;
    preferences?: Record<string, unknown>;
    custom_fields?: Record<string, unknown>;
    visit_count?: number;
    created_at?: string;
    updated_at?: string;
  };
  execution_logs: Array<{
    id: string;
    node_id: string;
    action: string;
    data: Record<string, unknown>;
    created_at: string;
  }>;
  conversation_messages: Message[];
}

export interface FlowRunsResponse {
  runs: FlowRun[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// Flow Runs API
export const flowRunsApi = {
  async list(params?: {
    flow_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<FlowRunsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.flow_id) searchParams.set('flow_id', params.flow_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.date_from) searchParams.set('date_from', params.date_from);
    if (params?.date_to) searchParams.set('date_to', params.date_to);
    const query = searchParams.toString();
    return fetchApi(`/flow-runs${query ? `?${query}` : ''}`);
  },

  async get(id: string): Promise<{ flow_run: FlowRunDetail }> {
    return fetchApi(`/flow-runs/${id}`);
  },
};

// Admin Organizations API
export const adminOrganizationsApi = {
  async list(): Promise<{ organizations: Organization[] }> {
    return fetchApi('/admin/organizations');
  },

  async get(id: string): Promise<{ organization: Organization }> {
    return fetchApi(`/admin/organizations/${id}`);
  },

  async create(data: {
    name: string;
    slug: string;
    logo_url?: string;
  }): Promise<{ organization: Organization }> {
    return fetchApi('/admin/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      logo_url?: string;
      is_active?: boolean;
    }
  ): Promise<{ organization: Organization }> {
    return fetchApi(`/admin/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return fetchApi(`/admin/organizations/${id}`, {
      method: 'DELETE',
    });
  },
};

// Admin Users API
export const adminUsersApi = {
  async list(): Promise<{ users: User[] }> {
    return fetchApi('/admin/users');
  },

  async get(id: string): Promise<{ user: User }> {
    return fetchApi(`/admin/users/${id}`);
  },

  async create(data: {
    email: string;
    password: string;
    full_name?: string;
    role?: 'super_admin' | 'org_admin' | 'user';
    organization_id?: string;
  }): Promise<{ user: User }> {
    return fetchApi('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: {
      full_name?: string;
      role?: 'super_admin' | 'org_admin' | 'user';
      organization_id?: string | null;
      is_active?: boolean;
    }
  ): Promise<{ user: User }> {
    return fetchApi(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return fetchApi(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// Conversation types
export interface Conversation {
  id: string;
  organization_id: string;
  whatsapp_config_id: string;
  contact_phone: string;
  contact_name: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: 'inbound' | 'outbound' | null;
  unread_count: number;
  status: 'active' | 'archived' | 'closed';
  created_at: string;
  updated_at: string;
  in_free_window: boolean;
  window_expires_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  whatsapp_message_id: string | null;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string | null;
  media_url: string | null;
  metadata: Record<string, unknown>;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  sent_at: string;
  created_at: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface ConversationDetailResponse {
  conversation: Conversation;
  messages: Message[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// Stamp Card Template types
export interface StampCardTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  title: string;
  subtitle: string;
  total_stamps: number;
  stamp_icon: string;
  background_color: string;
  accent_color: string;
  logo_url: string | null;
  reward_text: string;
  font_family: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Stamp Card Templates API
export const stampTemplatesApi = {
  async list(): Promise<{ templates: StampCardTemplate[] }> {
    return fetchApi('/stamp-templates');
  },

  async get(id: string): Promise<{ template: StampCardTemplate }> {
    return fetchApi(`/stamp-templates/${id}`);
  },

  async create(data: {
    name: string;
    title?: string;
    subtitle?: string;
    total_stamps?: number;
    stamp_icon?: string;
    background_color?: string;
    accent_color?: string;
    logo_url?: string;
    reward_text?: string;
    font_family?: string;
  }): Promise<{ template: StampCardTemplate }> {
    return fetchApi('/stamp-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      title?: string;
      subtitle?: string;
      total_stamps?: number;
      stamp_icon?: string;
      background_color?: string;
      accent_color?: string;
      logo_url?: string;
      reward_text?: string;
      font_family?: string;
      is_active?: boolean;
    }
  ): Promise<{ template: StampCardTemplate }> {
    return fetchApi(`/stamp-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return fetchApi(`/stamp-templates/${id}`, {
      method: 'DELETE',
    });
  },
};

// Conversations API
export const conversationsApi = {
  async list(params?: {
    status?: string;
    config_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConversationsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.config_id) searchParams.set('config_id', params.config_id);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const query = searchParams.toString();
    return fetchApi(`/conversations${query ? `?${query}` : ''}`);
  },

  async get(
    id: string,
    messageLimit?: number,
    messageOffset?: number
  ): Promise<ConversationDetailResponse> {
    const searchParams = new URLSearchParams();
    if (messageLimit) searchParams.set('message_limit', String(messageLimit));
    if (messageOffset) searchParams.set('message_offset', String(messageOffset));

    const query = searchParams.toString();
    return fetchApi(`/conversations/${id}${query ? `?${query}` : ''}`);
  },

  async update(
    id: string,
    data: {
      status?: string;
      contact_name?: string;
      mark_read?: boolean;
    }
  ): Promise<{ conversation: Conversation }> {
    return fetchApi(`/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async archive(id: string): Promise<{ success: boolean }> {
    return fetchApi(`/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  async getMessages(
    id: string,
    limit?: number,
    offset?: number,
    before?: string
  ): Promise<MessagesResponse> {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.set('limit', String(limit));
    if (offset) searchParams.set('offset', String(offset));
    if (before) searchParams.set('before', before);

    const query = searchParams.toString();
    return fetchApi(`/conversations/${id}/messages${query ? `?${query}` : ''}`);
  },

  async sendMessage(
    id: string,
    content: string,
    messageType: string = 'text'
  ): Promise<{ message: Message; whatsapp_response: unknown }> {
    return fetchApi(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, message_type: messageType }),
    });
  },

  async sendImage(
    id: string,
    mediaUrl: string,
    caption?: string
  ): Promise<{ message: Message; whatsapp_response: unknown }> {
    return fetchApi(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        message_type: 'image',
        media_url: mediaUrl,
        caption,
      }),
    });
  },

  async sendVideo(
    id: string,
    mediaUrl: string,
    caption?: string
  ): Promise<{ message: Message; whatsapp_response: unknown }> {
    return fetchApi(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        message_type: 'video',
        media_url: mediaUrl,
        caption,
      }),
    });
  },

  async sendAudio(
    id: string,
    mediaUrl: string
  ): Promise<{ message: Message; whatsapp_response: unknown }> {
    return fetchApi(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        message_type: 'audio',
        media_url: mediaUrl,
      }),
    });
  },

  async sendDocument(
    id: string,
    mediaUrl: string,
    filename?: string,
    caption?: string
  ): Promise<{ message: Message; whatsapp_response: unknown }> {
    return fetchApi(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        message_type: 'document',
        media_url: mediaUrl,
        filename,
        caption,
      }),
    });
  },

  async sendLocation(
    id: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<{ message: Message; whatsapp_response: unknown }> {
    return fetchApi(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        message_type: 'location',
        latitude,
        longitude,
        location_name: name,
        location_address: address,
      }),
    });
  },
};

// Stamp Program types
export interface StampProgram {
  id: string;
  organization_id: string;
  business_name: string;
  total_stamps: number;
  stamp_icon: string;
  background_color: string;
  accent_color: string;
  reward_text: string;
  trigger_keyword: string;
  dashboard_token: string | null;
  tier: 'free' | 'pro' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StampProgramStats {
  total_customers: number;
  active_cards: number;
  total_stamps: number;
  completed_cards: number;
  stamps_this_week: number;
  new_customers_this_week: number;
  segments: {
    new: number;
    regular: number;
    almost_there: number;
    reward_ready: number;
    lapsed: number;
  };
  recent_events: Array<{
    type: 'stamp' | 'reward' | 'new_customer';
    description: string;
    created_at: string;
  }>;
}

export interface LoyaltyCustomer {
  id: string;
  phone: string;
  name: string | null;
  current_stamps: number;
  total_stamps_earned: number;
  rewards_claimed: number;
  segment: string;
  last_visit: string | null;
  created_at: string;
}

export interface LoyaltyEvent {
  id: string;
  type: 'stamp' | 'reward_claimed' | 'card_reset';
  customer_id: string;
  customer_phone: string;
  customer_name: string | null;
  stamps_before: number;
  stamps_after: number;
  created_at: string;
}

// Stamp Programs API
export const stampProgramsApi = {
  async list(): Promise<{ programs: StampProgram[] }> {
    return fetchApi('/stamp-programs');
  },

  async get(id: string): Promise<{ program: StampProgram }> {
    return fetchApi(`/stamp-programs/${id}`);
  },

  async create(data: {
    business_name: string;
    total_stamps?: number;
    stamp_icon?: string;
    background_color?: string;
    accent_color?: string;
    reward_text?: string;
    trigger_keyword?: string;
  }): Promise<{ program: StampProgram }> {
    return fetchApi('/stamp-programs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: {
      business_name?: string;
      total_stamps?: number;
      stamp_icon?: string;
      background_color?: string;
      accent_color?: string;
      reward_text?: string;
      trigger_keyword?: string;
      is_active?: boolean;
    }
  ): Promise<{ program: StampProgram }> {
    return fetchApi(`/stamp-programs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return fetchApi(`/stamp-programs/${id}`, {
      method: 'DELETE',
    });
  },

  async getStats(id: string): Promise<StampProgramStats> {
    return fetchApi(`/stamp-programs/${id}/stats`);
  },

  async getCustomers(
    id: string,
    params?: {
      limit?: number;
      offset?: number;
      segment?: string;
      search?: string;
    }
  ): Promise<{
    customers: LoyaltyCustomer[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.segment) searchParams.set('segment', params.segment);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return fetchApi(`/stamp-programs/${id}/customers${query ? `?${query}` : ''}`);
  },

  async getEvents(
    id: string,
    params?: {
      limit?: number;
      offset?: number;
      type?: string;
    }
  ): Promise<{
    events: LoyaltyEvent[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.type) searchParams.set('type', params.type);
    const query = searchParams.toString();
    return fetchApi(`/stamp-programs/${id}/events${query ? `?${query}` : ''}`);
  },
};

// Public Dashboard types
export interface PublicDashboardData {
  program: {
    business_name: string;
    total_stamps: number;
    stamp_icon: string;
    background_color: string;
    accent_color: string;
    reward_text: string;
    trigger_keyword: string;
    tier: string;
  };
  stats: {
    total_customers: number;
    active_cards: number;
    total_stamps: number;
    completed_cards: number;
    stamps_this_week: number;
    new_customers_this_week: number;
    segments: {
      new: number;
      regular: number;
      almost_there: number;
      reward_ready: number;
      lapsed: number;
    };
  };
}

// Public Dashboard API (no auth required)
export const publicDashboardApi = {
  async get(token: string): Promise<PublicDashboardData> {
    // This endpoint doesn't require auth
    const response = await fetch(`${API_BASE}/public/dashboard/${token}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ApiError).error || 'Failed to load dashboard');
    }

    return data as PublicDashboardData;
  },
};
