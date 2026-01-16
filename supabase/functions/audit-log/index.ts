import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AuditLogRequest {
  entityType: 'framework' | 'question' | 'setting' | 'answer';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'disable' | 'enable';
  changes: Record<string, unknown>;
  sessionId?: string;
}

interface GeoLocation {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
  isp: string | null;
}

function parseUserAgent(ua: string): { deviceType: string; browserName: string; osName: string } {
  let deviceType = 'desktop';
  let browserName = 'Unknown';
  let osName = 'Unknown';

  // Device type detection
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    deviceType = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
  }

  // Browser detection
  if (/Firefox/i.test(ua)) browserName = 'Firefox';
  else if (/Edg/i.test(ua)) browserName = 'Edge';
  else if (/Chrome/i.test(ua)) browserName = 'Chrome';
  else if (/Safari/i.test(ua)) browserName = 'Safari';
  else if (/Opera|OPR/i.test(ua)) browserName = 'Opera';

  // OS detection
  if (/Windows/i.test(ua)) osName = 'Windows';
  else if (/Mac OS X/i.test(ua)) osName = 'macOS';
  else if (/Linux/i.test(ua)) osName = 'Linux';
  else if (/Android/i.test(ua)) osName = 'Android';
  else if (/iOS|iPhone|iPad|iPod/i.test(ua)) osName = 'iOS';

  return { deviceType, browserName, osName };
}

function getClientIp(req: Request): string | null {
  // Try various headers that might contain the real IP
  const headers = [
    'x-real-ip',
    'x-forwarded-for',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'true-client-ip',
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return value.split(',')[0].trim();
    }
  }

  return null;
}

/**
 * Fetch geolocation data for an IP address using ip-api.com (free, no API key required)
 * Rate limit: 45 requests per minute for free tier
 */
async function getGeoLocation(ip: string | null): Promise<GeoLocation> {
  const defaultGeo: GeoLocation = {
    country: null,
    countryCode: null,
    city: null,
    region: null,
    timezone: null,
    isp: null,
  };

  if (!ip) return defaultGeo;

  // Skip private/local IPs
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.') || 
      ip === '127.0.0.1' || ip === 'localhost' || ip === '::1') {
    return { ...defaultGeo, country: 'Local Network', city: 'Private' };
  }

  try {
    // Using ip-api.com - free for non-commercial use, no API key needed
    // Fields: country, countryCode, region, regionName, city, timezone, isp
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,timezone,isp`,
      { 
        signal: AbortSignal.timeout(3000) // 3 second timeout
      }
    );

    if (!response.ok) {
      console.warn(`Geo lookup failed for ${ip}: HTTP ${response.status}`);
      return defaultGeo;
    }

    const data = await response.json();

    if (data.status === 'fail') {
      console.warn(`Geo lookup failed for ${ip}: ${data.message}`);
      return defaultGeo;
    }

    return {
      country: data.country || null,
      countryCode: data.countryCode || null,
      city: data.city || null,
      region: data.regionName || data.region || null,
      timezone: data.timezone || null,
      isp: data.isp || null,
    };
  } catch (error) {
    console.warn(`Geo lookup error for ${ip}:`, error);
    return defaultGeo;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user's JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: AuditLogRequest = await req.json();
    
    // Validate required fields
    if (!body.entityType || !body.entityId || !body.action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: entityType, entityId, action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract request metadata
    const userAgent = req.headers.get("user-agent") || "";
    const ipAddress = getClientIp(req);
    const sessionId = req.headers.get("x-session-id") || body.sessionId;
    const { deviceType, browserName, osName } = parseUserAgent(userAgent);

    // Fetch geolocation data (non-blocking, with timeout)
    const geoLocation = await getGeoLocation(ipAddress);

    // Insert audit log with detailed metadata including geolocation
    const { data, error } = await supabase
      .from("change_logs")
      .insert({
        user_id: user.id,
        entity_type: body.entityType,
        entity_id: body.entityId,
        action: body.action,
        changes: body.changes || {},
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: sessionId,
        device_type: deviceType,
        browser_name: browserName,
        os_name: osName,
        geo_country: geoLocation.country,
        geo_city: geoLocation.city,
      })
      .select("id, request_id")
      .single();

    if (error) {
      console.error("Error inserting audit log:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create audit log", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: data.id,
        requestId: data.request_id,
        geo: geoLocation
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Audit log error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
