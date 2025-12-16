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
