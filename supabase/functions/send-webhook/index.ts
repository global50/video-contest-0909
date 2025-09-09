import { corsHeaders } from '../_shared/cors.ts'

interface VideoContestRow {
  id: number;
  full_name: string | null;
  username: string | null;
  video_title: string | null;
  team_count: number | null;
  video_url: string | null;
  tg_id: string | null;
  created_at: string;
}

interface WebhookPayload {
  event: 'video_contest.insert';
  data: VideoContestRow;
  timestamp: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse the webhook payload from Supabase
    const { record } = await req.json();
    
    if (!record) {
      console.error('No record data received from webhook');
      return new Response(
        JSON.stringify({ error: 'No record data provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Received new video contest submission:', JSON.stringify(record, null, 2));

    // Get webhook endpoint from environment variables
    const webhookUrl = Deno.env.get('WEBHOOK_ENDPOINT_URL');
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

    if (!webhookUrl) {
      console.error('WEBHOOK_ENDPOINT_URL environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Webhook endpoint not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare webhook payload
    const webhookPayload: WebhookPayload = {
      platform: 'tg',
      event: 'video_contest.insert',
      data: {
        id: record.id,
        full_name: record.full_name,
        username: record.username,
        video_title: record.video_title,
        team_count: record.team_count,
        video_url: record.video_url,
        tg_id: record.tg_id,
        created_at: record.created_at
      },
      timestamp: new Date().toISOString()
    };

    console.log('Sending webhook to:', webhookUrl);
    console.log('Webhook payload:', JSON.stringify(webhookPayload, null, 2));

    // Prepare headers for webhook request
    const webhookHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Supabase-Webhook/1.0'
    };

    // Add webhook secret if provided
    if (webhookSecret) {
      // Create HMAC signature for security
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(webhookPayload));
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, data);
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      webhookHeaders['X-Webhook-Signature'] = `sha256=${signatureHex}`;
    }

    // Send webhook request
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: webhookHeaders,
      body: JSON.stringify(webhookPayload)
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`Webhook request failed with status ${webhookResponse.status}:`, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Webhook delivery failed',
          status: webhookResponse.status,
          details: errorText
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const responseText = await webhookResponse.text();
    console.log('Webhook delivered successfully:', responseText);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook delivered successfully',
        webhook_status: webhookResponse.status,
        webhook_response: responseText
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Webhook delivery error:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook delivery failed',
        details: error.message || 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});