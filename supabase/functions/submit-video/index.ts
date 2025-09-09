import { corsHeaders } from '../_shared/cors.ts'

interface SubmissionData {
  video_title: string;
  team_count: number;
  video_url: string;
  full_name?: string;
  username?: string;
  tg_id?: string;
  full_name?: string;
  username?: string;
  tg_id?: string;
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

    // Parse request body
    const submissionData: SubmissionData = await req.json();

    // Validate required fields
    if (!submissionData.video_title || !submissionData.team_count || !submissionData.video_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: video_title, team_count, video_url' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check for required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl) {
      console.error('Missing SUPABASE_URL environment variable');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing SUPABASE_URL' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Environment variables check passed');
    console.log('Attempting to initialize Supabase client...');

    // Initialize Supabase client
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Supabase client initialized successfully');
    console.log('Attempting database insert with data:', JSON.stringify({
      video_title: submissionData.video_title,
      team_count: submissionData.team_count,
      video_url: submissionData.video_url ? 'URL_PROVIDED' : 'NO_URL',
      full_name: submissionData.full_name || 'NULL',
      username: submissionData.username || 'NULL',
      tg_id: submissionData.tg_id || 'NULL'
    }));

    // Insert submission into database
    const { data, error } = await supabase
      .from('video_contest')
      .insert([
        {
          video_title: submissionData.video_title,
          team_count: submissionData.team_count,
          video_url: submissionData.video_url,
          full_name: submissionData.full_name || null,
          username: submissionData.username || null,
          tg_id: submissionData.tg_id || null,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database insertion failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save submission to database',
          details: error.message || 'Unknown database error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Database insertion successful:', JSON.stringify(data, null, 2));

    // Call the send-webhook Edge Function after successful database insert
    try {
      console.log('Calling send-webhook Edge Function...');
      
      const webhookUrl = `${supabaseUrl}/functions/v1/send-webhook`;
      const webhookPayload = {
        record: data // Pass the newly inserted row data
      };
      
      console.log('Webhook payload:', JSON.stringify(webhookPayload, null, 2));
      
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });
      
      if (webhookResponse.ok) {
        const webhookResult = await webhookResponse.text();
        console.log('Webhook called successfully:', webhookResult);
      } else {
        const webhookError = await webhookResponse.text();
        console.error('Webhook call failed:', webhookResponse.status, webhookError);
        // Don't throw error here - the main insert was successful
      }
      
    } catch (webhookError) {
      console.error('Error calling webhook Edge Function:', webhookError);
      // Don't throw error here - the main insert was successful
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Video submission saved successfully',
        data: data 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Unexpected function error:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});