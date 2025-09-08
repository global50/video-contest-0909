import { initializeSubmissionForm } from './submission.js';
import { initializeDashboard } from './dashboard.js';
import { router } from './router.js';

// Main application logic and route handlers
document.addEventListener('DOMContentLoaded', function() {
  const app = document.getElementById('app');

  // Route handlers
  router.addRoute('/', renderHome);
  router.addRoute('/submit', renderSubmit);
  router.addRoute('/manager', renderManager);

  // Handle initial route after all routes are registered
  router.handleRoute();

  // Home page template
  function renderHome() {
    app.innerHTML = `
      <header>
        <h1>Конкурс короткометражек</h1>
        <!-- <p>Welcome to the video contest submission and management system</p> -->
      </header>
      
      <main class="main-content">
        <div class="card-grid">
          <div class="feature-card">
            <div class="card-icon">📝</div>
            <h2>Отправить видео</h2>
            <p>Загрузить заявку с видео</p> 
            <button onclick="router.navigate('/submit')" class="btn btn-primary">Go to Submission Form</button>
          </div>
          
          <div class="feature-card">
            <div class="card-icon">📊</div>
            <h2>Manager Dashboard</h2>
            <p>View all contest submissions and manage entries</p>
            <button onclick="router.navigate('/manager')" class="btn btn-secondary">View Dashboard</button>
          </div>
        </div>
      </main>
    `;
  }

  // Submit page template
  function renderSubmit() {
    // Extract URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userParams = {
      full_name: urlParams.get('full_name') || '',
      username: urlParams.get('username') || '',
      tg_id: urlParams.get('id') || ''
    };

    app.innerHTML = `
      <header>
        <h1>Video Contest Submission</h1>
      </header>
      
      <main>
        <form id="submissionForm" class="submission-form">
          <div class="form-group">
            <label for="videoTitle">What is your video called?</label>
            <input 
              type="text" 
              id="videoTitle" 
              name="videoTitle" 
              placeholder="Enter video title"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="teamCount">How many people were in your team?</label>
            <input 
              type="number" 
              id="teamCount" 
              name="teamCount" 
              min="1" 
              max="100" 
              value="1"
              required
            >
          </div>
          
          <div class="form-group">
            <label>Video File</label>
            <div class="file-upload-area" id="fileUploadArea">
              <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </div>
              <p>Click to upload or drag and drop your video here</p>
              <p class="file-info">Upload original file without compression. MP4, AVI, MOV</p>
              <input type="file" id="videoFile" name="videoFile" accept="video/*" required hidden>
              <button type="button" class="btn btn-outline" id="selectFileBtn">Select File</button>
            </div>
            <div id="filePreview" class="file-preview" style="display: none;">
              <div class="preview-info">
                <span class="file-name"></span>
                <span class="file-size"></span>
                <button type="button" class="remove-file" id="removeFile">×</button>
              </div>
            </div>
          </div>
          
          <button type="submit" class="btn btn-primary submit-btn">Submit Entry</button>
        </form>
      </main>
    `;
    
    // Initialize submission form after rendering
    initializeSubmissionForm(userParams);
  }

  // Manager page template
  function renderManager() {
    app.innerHTML = `
      <header>
        <h1>Contest Participants</h1>
      </header>
      
      <main>
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-number" id="totalSubmissions">0</div>
            <div class="stat-label">Total Submissions</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="totalParticipants">0</div>
            <div class="stat-label">Total Participants</div>
          </div>
        </div>
        
        <div class="submissions-section">
          <div class="section-header">
            <h2>Submitted Videos</h2>
          </div>
          
          <div class="table-container">
            <table id="submissionsTable">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Video</th>
                  <th>Name</th>
                  <th>Team Size</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody id="submissionsTableBody">
                <tr id="emptyState">
                  <td colspan="5" class="empty-state">
                    <div class="empty-icon">📹</div>
                    <p>No submissions yet</p>
                    <button onclick="router.navigate('/submit')" class="btn btn-primary">Add First Submission</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    `;
    
    // Initialize dashboard after rendering
    initializeDashboard();
  }
});