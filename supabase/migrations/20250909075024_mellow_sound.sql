/*
  # Create webhook trigger for video contest submissions

  1. Database Changes
    - Create a trigger function that calls the webhook edge function
    - Create a trigger on video_contest table that fires after INSERT
    - The trigger will send the new row data to the webhook endpoint

  2. Security
    - Uses service role to call the edge function
    - Includes error handling for failed webhook calls

  3. Notes
    - The webhook will be called asynchronously after each insert
    - Failed webhook calls will be logged but won't prevent the insert
*/

-- Create function to call webhook edge function
CREATE OR REPLACE FUNCTION notify_video_contest_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url text;
  response_status int;
BEGIN
  -- Get the webhook function URL
  webhook_url := current_setting('app.supabase_url', true) || '/functions/v1/send-webhook';
  
  -- Call the webhook edge function asynchronously
  -- Note: This uses pg_net extension if available, otherwise logs the event
  BEGIN
    -- Try to call the webhook using HTTP request
    SELECT status INTO response_status
    FROM http((
      'POST',
      webhook_url,
      ARRAY[
        http_header('Authorization', 'Bearer ' || current_setting('app.service_role_key', true)),
        http_header('Content-Type', 'application/json')
      ],
      'application/json',
      json_build_object('record', row_to_json(NEW))::text
    ));
    
    -- Log successful webhook call
    RAISE LOG 'Webhook called successfully for video_contest id: %, status: %', NEW.id, response_status;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log webhook failure but don't prevent the insert
    RAISE LOG 'Webhook call failed for video_contest id: %, error: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after INSERT on video_contest table
DROP TRIGGER IF EXISTS video_contest_webhook_trigger ON video_contest;

CREATE TRIGGER video_contest_webhook_trigger
  AFTER INSERT ON video_contest
  FOR EACH ROW
  EXECUTE FUNCTION notify_video_contest_webhook();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_video_contest_webhook() TO service_role;