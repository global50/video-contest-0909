// Storage utility for managing video contest submissions with Supabase
import { supabase } from './supabaseClient.js';

class VideoContestStorage {
  constructor() {
    this.bucketName = 'video_contest';
  }

  // Upload video file to Supabase Storage
  async uploadVideo(file) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error('Failed to upload video file');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        path: filePath,
        publicUrl: publicUrl
      };
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  }

  // Upload video file with progress tracking using XMLHttpRequest
  async uploadVideoWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `videos/${fileName}`;
        
        // Get upload URL from Supabase
        const supabaseUrl = window.VITE_SUPABASE_URL;
        const supabaseKey = window.VITE_SUPABASE_ANON_KEY;
        const uploadUrl = `${supabaseUrl}/storage/v1/object/${this.bucketName}/${filePath}`;
        
        const xhr = new XMLHttpRequest();
        const startTime = Date.now();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(e.loaded, e.total, startTime);
          }
        });
        
        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Get public URL
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/${this.bucketName}/${filePath}`;
            resolve({
              path: filePath,
              publicUrl: publicUrl
            });
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        });
        
        // Handle errors
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed due to network error'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was aborted'));
        });
        
        // Configure request
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.setRequestHeader('Cache-Control', '3600');
        
        // Send file
        xhr.send(file);
        
      } catch (error) {
        reject(error);
      }
    });
  }
  // Save submission to database
  async saveSubmission(submissionData) {
    try {
      const { data, error } = await supabase
        .from('video_contest')
        .insert([{
          video_title: submissionData.video_title,
          team_count: submissionData.team_count,
          video_url: submissionData.video_url,
          full_name: submissionData.full_name || null,
          username: submissionData.username || null,
          tg_id: submissionData.tg_id || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to save submission to database');
      }

      return data;
    } catch (error) {
      console.error('Error saving submission:', error);
      throw error;
    }
  }

  // Get all submissions from database
  async getAllSubmissions() {
    try {
      const { data, error } = await supabase
        .from('video_contest')
        .select(`
          *,
          contest_users!inner(
            full_name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch submissions');
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return [];
    }
  }

  // Delete submission by ID
  async deleteSubmission(id) {
    try {
      // First get the submission to find the video path
      const { data: submission, error: fetchError } = await supabase
        .from('video_contest')
        .select('video_url')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching submission:', fetchError);
        throw new Error('Failed to find submission');
      }

      // Extract file path from URL if it's a Supabase storage URL
      if (submission.video_url && submission.video_url.includes(this.bucketName)) {
        const urlParts = submission.video_url.split('/');
        const pathIndex = urlParts.findIndex(part => part === this.bucketName);
        if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
          const filePath = urlParts.slice(pathIndex + 1).join('/');
          
          // Delete file from storage
          const { error: storageError } = await supabase.storage
            .from(this.bucketName)
            .remove([filePath]);

          if (storageError) {
            console.warn('Warning: Could not delete file from storage:', storageError);
          }
        }
      }

      // Delete record from database
      const { error: deleteError } = await supabase
        .from('video_contest')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Database delete error:', deleteError);
        throw new Error('Failed to delete submission');
      }

      return true;
    } catch (error) {
      console.error('Error deleting submission:', error);
      throw error;
    }
  }

  // Clear all submissions
  async clearAllSubmissions() {
    try {
      // Get all submissions first to delete their files
      const submissions = await this.getAllSubmissions();
      
      // Delete all files from storage
      const filePaths = [];
      submissions.forEach(submission => {
        if (submission.video_url && submission.video_url.includes(this.bucketName)) {
          const urlParts = submission.video_url.split('/');
          const pathIndex = urlParts.findIndex(part => part === this.bucketName);
          if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
            const filePath = urlParts.slice(pathIndex + 1).join('/');
            filePaths.push(filePath);
          }
        }
      });

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(this.bucketName)
          .remove(filePaths);

        if (storageError) {
          console.warn('Warning: Could not delete some files from storage:', storageError);
        }
      }

      // Delete all records from database
      const { error: deleteError } = await supabase
        .from('video_contest')
        .delete()
        .neq('id', 0); // Delete all records

      if (deleteError) {
        console.error('Database delete error:', deleteError);
        throw new Error('Failed to clear all submissions');
      }

      return true;
    } catch (error) {
      console.error('Error clearing submissions:', error);
      throw error;
    }
  }

  // Get submission statistics
  async getStats() {
    try {
      const submissions = await this.getAllSubmissions();
      return {
        totalSubmissions: submissions.length,
        totalParticipants: submissions.reduce((sum, sub) => sum + (parseInt(sub.team_count) || 0), 0)
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalSubmissions: 0,
        totalParticipants: 0
      };
    }
  }

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Format date for display
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
  }

  // Extract filename from URL
  getFileNameFromUrl(url) {
    if (!url) return 'Unknown';
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    // Remove timestamp prefix if present
    return filename.replace(/^\d+-[a-z0-9]+-/, '');
  }
}

// Export storage instance
export const videoStorage = new VideoContestStorage();