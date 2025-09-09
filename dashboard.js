// Dashboard functionality - now called by router
import { videoStorage } from './storage.js';

export function initializeDashboard() {
  const submissionsTableBody = document.getElementById('submissionsTableBody');
  if (!submissionsTableBody) return; // Exit if elements not found
  
  const emptyState = document.getElementById('emptyState');
  const totalSubmissionsEl = document.getElementById('totalSubmissions');
  const totalParticipantsEl = document.getElementById('totalParticipants');
  const videoModal = document.getElementById('videoModal');
  const modalVideo = document.getElementById('modalVideo');
  const videoModalTitle = document.getElementById('videoModalTitle');
  const closeVideoModal = document.getElementById('closeVideoModal');

  // Load dashboard data
  loadDashboard();

  // Close video modal handlers
  closeVideoModal.addEventListener('click', closeModal);
  videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) {
      closeModal();
    }
  });

  // Keyboard navigation for modal
  const handleKeydown = (e) => {
    if (e.key === 'Escape' && videoModal.style.display === 'flex') {
      closeModal();
    }
  };
  
  // Remove existing listener and add new one
  document.removeEventListener('keydown', handleKeydown);
  document.addEventListener('keydown', handleKeydown);

  // Load and display dashboard data
  async function loadDashboard() {
    try {
      const [submissions, stats] = await Promise.all([
        videoStorage.getAllSubmissions(),
        videoStorage.getStats()
      ]);
      
      // Update statistics
      updateStats(stats);
      
      // Clear current table content
      submissionsTableBody.innerHTML = '';
      
      if (submissions.length === 0) {
        // Show empty state
        submissionsTableBody.appendChild(emptyState);
      } else {
        // Hide empty state and populate table
        submissions.forEach(submission => {
          const row = createSubmissionRow(submission);
          submissionsTableBody.appendChild(row);
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Show error state
      submissionsTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <div class="empty-icon">⚠️</div>
            <p>Error loading submissions</p>
            <button onclick="location.reload()" class="btn btn-primary">Retry</button>
          </td>
        </tr>
      `;
    }
  }

  // Update statistics display
  function updateStats(stats) {
    totalSubmissionsEl.textContent = stats.totalSubmissions;
    totalParticipantsEl.textContent = stats.totalParticipants;
  }

  // Create a table row for a submission
  function createSubmissionRow(submission) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>
        <div class="submission-title">${escapeHtml(submission.video_title || 'Untitled')}</div>
      </td>
      <td>
        <button class="play-btn" onclick="playVideo('${submission.id}')" title="Play video">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
      </td>
      <td>
        <button class="download-btn" onclick="downloadVideo('${submission.id}')" title="Download video">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </td>
      <td>
        <span class="team-count">${submission.team_count || 1}</span>
      </td>
      <td>
        <div class="submission-date">${videoStorage.formatDate(submission.created_at)}</div>
      </td>
    `;
    return row;
  }

  // Play video in modal
  window.playVideo = async function(submissionId) {
    try {
      const submissions = await videoStorage.getAllSubmissions();
      const submission = submissions.find(s => s.id == submissionId);
      
      if (submission && submission.video_url) {
        videoModalTitle.textContent = submission.video_title || 'Video';
        modalVideo.src = submission.video_url;
        videoModal.style.display = 'flex';
        
        // Play video when modal opens
        modalVideo.play().catch(e => {
          console.log('Auto-play prevented:', e);
        });
      }
    } catch (error) {
      console.error('Error playing video:', error);
      alert('Failed to load video');
    }
  };

  // Download video function
  window.downloadVideo = async function(submissionId) {
    try {
      const submissions = await videoStorage.getAllSubmissions();
      const submission = submissions.find(s => s.id == submissionId);
      
      if (submission && submission.video_url) {
        // Show loading state
        const downloadBtn = document.querySelector(`button[onclick="downloadVideo('${submissionId}')"]`);
        const originalHTML = downloadBtn.innerHTML;
        downloadBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4-2"/>
          </svg>
        `;
        downloadBtn.disabled = true;
        
        // Create a temporary anchor element for download
        const link = document.createElement('a');
        link.href = submission.video_url;
        link.download = `${submission.video_title || 'video'}.mp4`;
        link.target = '_blank';
        
        // For cross-origin URLs, we need to fetch and create blob
        try {
          const response = await fetch(submission.video_url);
          if (!response.ok) throw new Error('Network response was not ok');
          
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          
          link.href = blobUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up blob URL
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
          
        } catch (fetchError) {
          console.warn('Fetch failed, trying direct download:', fetchError);
          // Fallback to direct download (may not work for cross-origin)
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        // Restore button state
        setTimeout(() => {
          downloadBtn.innerHTML = originalHTML;
          downloadBtn.disabled = false;
        }, 1000);
        
      } else {
        alert('Video not found or URL is missing');
      }
    } catch (error) {
      console.error('Error downloading video:', error);
      alert('Failed to download video');
    }
  };
  // Close video modal
  function closeModal() {
    videoModal.style.display = 'none';
    modalVideo.pause();
    modalVideo.src = '';
  }

  // Utility function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Auto-refresh dashboard every 30 seconds
  setInterval(async () => {
    try {
      const currentSubmissions = await videoStorage.getAllSubmissions();
      const displayedRows = submissionsTableBody.querySelectorAll('tr:not(#emptyState)').length;
      
      // Only reload if submission count has changed
      if (currentSubmissions.length !== displayedRows) {
        await loadDashboard();
      }
    } catch (error) {
      console.error('Error in auto-refresh:', error);
    }
  }, 30000);
}