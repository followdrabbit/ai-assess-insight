import { supabase } from '@/integrations/supabase/client';

export interface SIEMIntegration {
  id: string;
  userId: string | null;
  name: string;
  endpointUrl: string;
  format: 'json' | 'cef' | 'leef' | 'syslog';
  authType: 'none' | 'bearer' | 'basic' | 'api_key';
  authHeader: string | null;
  authValueEncrypted: string | null;
  isEnabled: boolean;
  includeIp: boolean;
  includeGeo: boolean;
  includeDevice: boolean;
  severityFilter: string[] | null;
  entityFilter: string[] | null;
  actionFilter: string[] | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  eventsSent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSIEMIntegrationInput {
  name: string;
  endpointUrl: string;
  format: 'json' | 'cef' | 'leef' | 'syslog';
  authType: 'none' | 'bearer' | 'basic' | 'api_key';
  authHeader?: string;
  authValue?: string;
  includeIp?: boolean;
  includeGeo?: boolean;
  includeDevice?: boolean;
  entityFilter?: string[];
  actionFilter?: string[];
}

export interface UpdateSIEMIntegrationInput extends Partial<CreateSIEMIntegrationInput> {
  isEnabled?: boolean;
}

// Map database row to interface
function mapIntegration(row: Record<string, unknown>): SIEMIntegration {
  return {
    id: row.id as string,
    userId: row.user_id as string | null,
    name: row.name as string,
    endpointUrl: row.endpoint_url as string,
    format: row.format as SIEMIntegration['format'],
    authType: row.auth_type as SIEMIntegration['authType'],
    authHeader: row.auth_header as string | null,
    authValueEncrypted: row.auth_value_encrypted as string | null,
    isEnabled: row.is_enabled as boolean,
    includeIp: row.include_ip as boolean,
    includeGeo: row.include_geo as boolean,
    includeDevice: row.include_device as boolean,
    severityFilter: row.severity_filter as string[] | null,
    entityFilter: row.entity_filter as string[] | null,
    actionFilter: row.action_filter as string[] | null,
    lastSuccessAt: row.last_success_at as string | null,
    lastErrorAt: row.last_error_at as string | null,
    lastErrorMessage: row.last_error_message as string | null,
    eventsSent: row.events_sent as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Get all SIEM integrations for the current user
 */
export async function getSIEMIntegrations(): Promise<SIEMIntegration[]> {
  const { data, error } = await supabase
    .from('siem_integrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch SIEM integrations:', error);
    return [];
  }

  return (data || []).map(mapIntegration);
}

/**
 * Get a single SIEM integration by ID
 */
export async function getSIEMIntegration(id: string): Promise<SIEMIntegration | null> {
  const { data, error } = await supabase
    .from('siem_integrations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch SIEM integration:', error);
    return null;
  }

  return mapIntegration(data);
}

/**
 * Create a new SIEM integration
 */
export async function createSIEMIntegration(
  input: CreateSIEMIntegrationInput
): Promise<{ success: boolean; integration?: SIEMIntegration; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('siem_integrations')
    .insert({
      user_id: user.id,
      name: input.name,
      endpoint_url: input.endpointUrl,
      format: input.format,
      auth_type: input.authType,
      auth_header: input.authHeader || null,
      auth_value_encrypted: input.authValue || null, // In production, encrypt this
      include_ip: input.includeIp ?? true,
      include_geo: input.includeGeo ?? true,
      include_device: input.includeDevice ?? true,
      entity_filter: input.entityFilter || null,
      action_filter: input.actionFilter || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create SIEM integration:', error);
    return { success: false, error: error.message };
  }

  return { success: true, integration: mapIntegration(data) };
}

/**
 * Update a SIEM integration
 */
export async function updateSIEMIntegration(
  id: string,
  input: UpdateSIEMIntegrationInput
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.endpointUrl !== undefined) updateData.endpoint_url = input.endpointUrl;
  if (input.format !== undefined) updateData.format = input.format;
  if (input.authType !== undefined) updateData.auth_type = input.authType;
  if (input.authHeader !== undefined) updateData.auth_header = input.authHeader;
  if (input.authValue !== undefined) updateData.auth_value_encrypted = input.authValue;
  if (input.isEnabled !== undefined) updateData.is_enabled = input.isEnabled;
  if (input.includeIp !== undefined) updateData.include_ip = input.includeIp;
  if (input.includeGeo !== undefined) updateData.include_geo = input.includeGeo;
  if (input.includeDevice !== undefined) updateData.include_device = input.includeDevice;
  if (input.entityFilter !== undefined) updateData.entity_filter = input.entityFilter;
  if (input.actionFilter !== undefined) updateData.action_filter = input.actionFilter;

  const { error } = await supabase
    .from('siem_integrations')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update SIEM integration:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a SIEM integration
 */
export async function deleteSIEMIntegration(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('siem_integrations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete SIEM integration:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Toggle a SIEM integration's enabled state
 */
export async function toggleSIEMIntegration(
  id: string,
  isEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  return updateSIEMIntegration(id, { isEnabled });
}

/**
 * Test a SIEM integration by sending a test event
 */
export async function testSIEMIntegration(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await supabase.functions.invoke('siem-forward', {
      body: {
        event: {
          id: 0,
          entityType: 'test',
          entityId: 'test-event',
          action: 'create',
          changes: { test: true },
          userId: (await supabase.auth.getUser()).data.user?.id,
          ipAddress: '127.0.0.1',
          geoCountry: 'Test Country',
          geoCity: 'Test City',
          deviceType: 'desktop',
          browserName: 'Test Browser',
          osName: 'Test OS',
          createdAt: new Date().toISOString(),
        },
        userId: (await supabase.auth.getUser()).data.user?.id,
        testMode: true,
        integrationId: id,
      },
    });

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get SIEM integration statistics
 */
export async function getSIEMStats(): Promise<{
  totalIntegrations: number;
  activeIntegrations: number;
  totalEventsSent: number;
  lastActivityAt: string | null;
}> {
  const { data, error } = await supabase
    .from('siem_integrations')
    .select('is_enabled, events_sent, last_success_at');

  if (error || !data) {
    return {
      totalIntegrations: 0,
      activeIntegrations: 0,
      totalEventsSent: 0,
      lastActivityAt: null,
    };
  }

  const totalEventsSent = data.reduce((sum, i) => sum + (i.events_sent || 0), 0);
  const activeIntegrations = data.filter(i => i.is_enabled).length;
  
  const lastActivities = data
    .map(i => i.last_success_at)
    .filter(Boolean)
    .sort()
    .reverse();

  return {
    totalIntegrations: data.length,
    activeIntegrations,
    totalEventsSent,
    lastActivityAt: lastActivities[0] || null,
  };
}
