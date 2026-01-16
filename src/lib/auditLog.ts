import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface AuditLogEntry {
  entityType: 'framework' | 'question' | 'setting' | 'answer';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'disable' | 'enable';
  changes: Record<string, unknown>;
}

export interface DetailedAuditLog extends AuditLogEntry {
  id: number;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  sessionId: string | null;
  geoCountry: string | null;
  geoCity: string | null;
  deviceType: string | null;
  browserName: string | null;
  osName: string | null;
  createdAt: string | null;
}

// Generate or retrieve session ID
function getSessionId(): string {
  const key = 'audit_session_id';
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}

/**
 * Log an audit event with full request context (IP, User-Agent, etc.)
 * Uses edge function to capture server-side headers
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<{ success: boolean; requestId?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.warn('No active session for audit logging');
      // Fallback to direct insert without detailed metadata
      await supabase.from('change_logs').insert({
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        action: entry.action,
        changes: entry.changes as Json,
      });
      return { success: true };
    }

    const response = await supabase.functions.invoke('audit-log', {
      body: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        changes: entry.changes,
        sessionId: getSessionId(),
      },
    });

    if (response.error) {
      console.error('Audit log error:', response.error);
      // Fallback to direct insert
      await supabase.from('change_logs').insert({
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        action: entry.action,
        changes: entry.changes as Json,
        session_id: getSessionId(),
      });
      return { success: true };
    }

    return { 
      success: true, 
      requestId: response.data?.requestId 
    };
  } catch (error) {
    console.error('Failed to log audit event:', error);
    return { success: false };
  }
}

/**
 * Get detailed audit logs with full metadata
 */
export async function getDetailedAuditLogs(options: {
  limit?: number;
  entityType?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}): Promise<DetailedAuditLog[]> {
  const { limit = 100, entityType, action, startDate, endDate, userId } = options;
  
  let query = supabase
    .from('change_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }
  
  if (action) {
    query = query.eq('action', action);
  }
  
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  
  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }
  
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    entityType: row.entity_type as DetailedAuditLog['entityType'],
    entityId: row.entity_id,
    action: row.action as DetailedAuditLog['action'],
    changes: (row.changes || {}) as Record<string, unknown>,
    userId: row.user_id,
    ipAddress: row.ip_address as string | null,
    userAgent: row.user_agent as string | null,
    requestId: row.request_id as string | null,
    sessionId: row.session_id as string | null,
    geoCountry: row.geo_country as string | null,
    geoCity: row.geo_city as string | null,
    deviceType: row.device_type as string | null,
    browserName: row.browser_name as string | null,
    osName: row.os_name as string | null,
    createdAt: row.created_at,
  }));
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(days: number = 30): Promise<{
  totalLogs: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byDevice: Record<string, number>;
  uniqueUsers: number;
  uniqueIPs: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('change_logs')
    .select('action, entity_type, device_type, user_id, ip_address')
    .gte('created_at', startDate.toISOString());

  if (error || !data) {
    return {
      totalLogs: 0,
      byAction: {},
      byEntityType: {},
      byDevice: {},
      uniqueUsers: 0,
      uniqueIPs: 0,
    };
  }

  const byAction: Record<string, number> = {};
  const byEntityType: Record<string, number> = {};
  const byDevice: Record<string, number> = {};
  const uniqueUsers = new Set<string>();
  const uniqueIPs = new Set<string>();

  data.forEach(row => {
    // Count by action
    byAction[row.action] = (byAction[row.action] || 0) + 1;
    
    // Count by entity type
    byEntityType[row.entity_type] = (byEntityType[row.entity_type] || 0) + 1;
    
    // Count by device
    const device = (row.device_type as string) || 'unknown';
    byDevice[device] = (byDevice[device] || 0) + 1;
    
    // Track unique users and IPs
    if (row.user_id) uniqueUsers.add(row.user_id);
    const ip = row.ip_address as string | null;
    if (ip) uniqueIPs.add(ip);
  });

  return {
    totalLogs: data.length,
    byAction,
    byEntityType,
    byDevice,
    uniqueUsers: uniqueUsers.size,
    uniqueIPs: uniqueIPs.size,
  };
}
