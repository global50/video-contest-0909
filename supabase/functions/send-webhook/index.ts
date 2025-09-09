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
  console.log('=== WEBHOOK FUNCTION STARTED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Processing webhook request...');

    // Only allow POST requests
    if (req.method !== 'POST') {
      console.error('Method not allowed:', req.method);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse the webhook payload from Supabase
    console.log('Parsing request body...');
    const { record } = await req.json();
    console.log('Parsed request body:', JSON.stringify({ record }, null, 2));
    
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
    console.log('Getting webhook endpoint URL from environment...');
    const webhookUrl = Deno.env.get('WEBHOOK_ENDPOINT_URL');
    console.log('Webhook URL:', webhookUrl ? 'SET' : 'NOT SET');

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
    console.log('Preparing webhook payload...');
    const webhookPayload: WebhookPayload = {
      platform: 'tg',
      users: ['-1002612547501'],
      platform: 'tg',
      users: ['194789787'],
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
    console.log('Webhook payload prepared:', JSON.stringify(webhookPayload, null, 2));

    console.log('Sending webhook to:', webhookUrl);

    // Prepare headers for webhook request
    console.log('Preparing webhook headers...');
    const webhookHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Supabase-Webhook/1.0',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
    };
    console.log('Webhook headers prepared:', JSON.stringify(webhookHeaders, null, 2));

    // Send webhook request
    console.log('Making HTTP request to webhook endpoint...');
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: webhookHeaders,
      body: JSON.stringify(webhookPayload)
    });
    console.log('HTTP request completed. Status:', webhookResponse.status);
    console.log('Response headers:', Object.fromEntries(webhookResponse.headers.entries()));

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
    console.log('=== WEBHOOK FUNCTION COMPLETED SUCCESSFULLY ===');

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
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.log('=== WEBHOOK FUNCTION FAILED ===');
    
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