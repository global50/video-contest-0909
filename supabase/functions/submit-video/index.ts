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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save submission to database' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});