// Dashboard functionality - now called by router
import { videoStorage } from './storage.js';

export function initializeDashboard() {
  const submissionsTableBody = document.getElementById('submissionsTableBody');
  if (!submissionsTableBody) return; // Exit if elements not found
  
  const emptyState = document.getElementById('emptyState');
  const totalSubmissionsEl = document.getElementById('totalSubmissions');
  const searchInput = document.getElementById('searchInput');
  const videoModal = document.getElementById('videoModal');
  const modalVideo = document.getElementById('modalVideo');
  const videoModalTitle = document.getElementById('videoModalTitle');
  const closeVideoModal = document.getElementById('closeVideoModal');

  // State for sorting and filtering
  let allSubmissions = [];
  let filteredSubmissions = [];
  let currentSort = { column: 'created_at', direction: 'desc' };

  // Load dashboard data
  loadDashboard();

  // Search functionality
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    filterAndDisplaySubmissions(searchTerm);
  });

  // Sorting functionality
  document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', () => {
      const column = header.dataset.column;
      if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
      }
      updateSortIndicators();
      const searchTerm = searchInput.value.toLowerCase().trim();
      filterAndDisplaySubmissions(searchTerm);
    });
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
  async function loadDashboard() {
    try {
      const [submissions] = await Promise.all([
        videoStorage.getAllSubmissions(),
      ]);
      
      allSubmissions = submissions;
      
      // Update statistics
      updateStats({ totalSubmissions: submissions.length });
      
      // Filter and display submissions
      const searchTerm = searchInput.value.toLowerCase().trim();
      filterAndDisplaySubmissions(searchTerm);
      
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

  // Filter and display submissions
  function filterAndDisplaySubmissions(searchTerm) {
    // Filter submissions
    if (searchTerm) {
      filteredSubmissions = allSubmissions.filter(submission => {
        const title = (submission.video_title || '').toLowerCase();
        const name = getDisplayName(submission).toLowerCase();
        return title.includes(searchTerm) || name.includes(searchTerm);
      });
    } else {
      filteredSubmissions = [...allSubmissions];
    }

    // Sort submissions
    sortSubmissions(filteredSubmissions);

    // Display submissions
    displaySubmissions(filteredSubmissions);
  }

  // Sort submissions
  function sortSubmissions(submissions) {
    submissions.sort((a, b) => {
      let aValue, bValue;

      switch (currentSort.column) {
        case 'video_title':
          aValue = (a.video_title || '').toLowerCase();
          bValue = (b.video_title || '').toLowerCase();
          break;
        case 'name':
          aValue = getDisplayName(a).toLowerCase();
          bValue = getDisplayName(b).toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return currentSort.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return currentSort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Display submissions in table
  function displaySubmissions(submissions) {
    // Clear current table content
    submissionsTableBody.innerHTML = '';
    
    if (submissions.length === 0) {
      // Show empty state
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="4" class="empty-state">
          <div class="empty-icon">📹</div>
          <p>${allSubmissions.length === 0 ? 'No submissions yet' : 'No submissions match your search'}</p>
          ${allSubmissions.length === 0 ? '<button onclick="router.navigate(\'/submit\')" class="btn btn-primary">Add First Submission</button>' : ''}
        </td>
      `;
      submissionsTableBody.appendChild(emptyRow);
    } else {
      // Populate table with submissions
      submissions.forEach(submission => {
        const row = createSubmissionRow(submission);
        submissionsTableBody.appendChild(row);
      });
    }
  }

  // Update sort indicators
  function updateSortIndicators() {
    document.querySelectorAll('.sortable').forEach(header => {
      const indicator = header.querySelector('.sort-indicator');
      const column = header.dataset.column;
      
      if (column === currentSort.column) {
        indicator.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
        header.classList.add('sorted');
      } else {
        indicator.textContent = '';
        header.classList.remove('sorted');
      }
    });
  }

  // Get display name for a submission
  function getDisplayName(submission) {
    let nameDisplay = '';
    if (submission.full_name || submission.username) {
      if (submission.full_name) {
        nameDisplay = submission.full_name;
        if (submission.username) {
          nameDisplay += ` @${submission.username}`;
        }
      } else if (submission.username) {
        nameDisplay = `@${submission.username}`;
      }
    } else {
      nameDisplay = '-';
    }
    return nameDisplay;
  }

  // Update statistics display
  function updateStats(stats) {
    totalSubmissionsEl.textContent = stats.totalSubmissions;
  }

  // Create a table row for a submission
  function createSubmissionRow(submission) {
    const row = document.createElement('tr');
    
    const nameDisplay = getDisplayName(submission);
    
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
        <div class="submission-name">${escapeHtml(nameDisplay)}</div>
      </td>
      <td>
        <div class="submission-name">${escapeHtml(nameDisplay)}</div>
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
      
      // Only reload if submission count has changed
      if (currentSubmissions.length !== allSubmissions.length) {
        await loadDashboard();
      }
    } catch (error) {
      console.error('Error in auto-refresh:', error);
    }
  }, 30000);

  // Initialize sort indicators
  updateSortIndicators();
}