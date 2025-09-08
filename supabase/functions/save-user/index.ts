import { corsHeaders } from '../_shared/cors.ts'

interface UserData {
  full_name?: string;
  username?: string;
  tg_id: string;
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
    const userData: UserData = await req.json();

    // Validate required fields
    if (!userData.tg_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: tg_id' }),
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

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('contest_users')
      .select('tg_id')
      .eq('tg_id', userData.tg_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Database check error:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing user' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let result;
    if (existingUser) {
      // Update existing user
      const { data, error } = await supabase
        .from('contest_users')
        .update({
          full_name: userData.full_name || null,
          username: userData.username || null,
        })
        .eq('tg_id', userData.tg_id)
        .select()
        .single();

      if (error) {
        console.error('Database update error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update user data' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      result = { action: 'updated', data };
    } else {
      // Insert new user
      const { data, error } = await supabase
        .from('contest_users')
        .insert([
          {
            full_name: userData.full_name || null,
            username: userData.username || null,
            tg_id: userData.tg_id,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to save user data' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      result = { action: 'created', data };
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${result.action} successfully`,
        ...result
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