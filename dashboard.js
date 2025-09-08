// Dashboard functionality - now called by router
function initializeDashboard() {
  const submissionsTableBody = document.getElementById('submissionsTableBody');
  if (!submissionsTableBody) return; // Exit if elements not found
  
  const emptyState = document.getElementById('emptyState');
  const totalSubmissionsEl = document.getElementById('totalSubmissions');
  const totalParticipantsEl = document.getElementById('totalParticipants');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const videoModal = document.getElementById('videoModal');
  const modalVideo = document.getElementById('modalVideo');
  const videoModalTitle = document.getElementById('videoModalTitle');
  const closeVideoModal = document.getElementById('closeVideoModal');

  // Load dashboard data
  loadDashboard();

  // Clear all submissions handler
  clearAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all submissions? This action cannot be undone.')) {
      videoStorage.clearAllSubmissions();
      loadDashboard();
    }
  });

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
  function loadDashboard() {
    const submissions = videoStorage.getAllSubmissions();
    const stats = videoStorage.getStats();
    
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
        <div class="submission-title">${escapeHtml(submission.title)}</div>
      </td>
      <td>
        <span class="team-count">${submission.teamCount} ${submission.teamCount === 1 ? 'person' : 'people'}</span>
      </td>
      <td>
        <div class="submission-date">${videoStorage.formatDate(submission.submittedAt)}</div>
        <div class="file-info" style="font-size: 0.75rem; color: var(--gray-500); margin-top: 0.25rem;">
          ${escapeHtml(submission.fileName)} (${videoStorage.formatFileSize(submission.fileSize)})
        </div>
      </td>
      <td>
        <button class="play-btn" onclick="playVideo('${submission.id}')" title="Play video">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
      </td>
      <td>
        <button class="delete-btn" onclick="deleteSubmission('${submission.id}')" title="Delete submission">
          Delete
        </button>
      </td>
    `;
    return row;
  }

  // Play video in modal
  window.playVideo = function(submissionId) {
    const submissions = videoStorage.getAllSubmissions();
    const submission = submissions.find(s => s.id === submissionId);
    
    if (submission) {
      videoModalTitle.textContent = submission.title;
      modalVideo.src = submission.videoData;
      videoModal.style.display = 'flex';
      
      // Play video when modal opens
      modalVideo.play().catch(e => {
        console.log('Auto-play prevented:', e);
      });
    }
  };

  // Delete submission
  window.deleteSubmission = function(submissionId) {
    const submissions = videoStorage.getAllSubmissions();
    const submission = submissions.find(s => s.id === submissionId);
    
    if (submission && confirm(`Are you sure you want to delete "${submission.title}"?`)) {
      videoStorage.deleteSubmission(submissionId);
      loadDashboard();
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

  // Auto-refresh dashboard every 30 seconds (in case of multiple users)
  setInterval(() => {
    const currentSubmissions = videoStorage.getAllSubmissions().length;
    const displayedRows = submissionsTableBody.querySelectorAll('tr:not(#emptyState)').length;
    
    // Only reload if submission count has changed
    if (currentSubmissions !== displayedRows) {
      loadDashboard();
    }
  }, 30000);
}