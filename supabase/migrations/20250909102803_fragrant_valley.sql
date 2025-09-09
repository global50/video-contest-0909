/*
  # Disable webhook trigger

  1. Changes
    - Drop the existing webhook trigger on video_contest table
    - This prevents duplicate webhook calls since we're now calling the webhook directly from the Edge Function

  2. Notes
    - The trigger function notify_video_contest_webhook() will remain but won't be called
    - This ensures we only have one webhook call path: submit-video -> send-webhook
*/

-- Drop the existing trigger
DROP TRIGGER IF EXISTS video_contest_webhook_trigger ON public.video_contest;

-- Log the change
DO $$
BEGIN
  RAISE LOG 'Webhook trigger disabled - webhook calls now handled by submit-video Edge Function';
END $$;