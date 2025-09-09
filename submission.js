// Submission form functionality - now called by router
import { videoStorage } from './storage.js';

export function initializeSubmissionForm(userParams = {}) {
  const form = document.getElementById('submissionForm');
  if (!form) return; // Exit if form not found
  
  const fileUploadArea = document.getElementById('fileUploadArea');
  const videoFileInput = document.getElementById('videoFile');
  const selectFileBtn = document.getElementById('selectFileBtn');
  const filePreview = document.getElementById('filePreview');
  const removeFileBtn = document.getElementById('removeFile');
  const successModal = document.getElementById('successModal');

  let selectedFile = null;
  
  // Remove any existing event listeners to prevent duplicates
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  
  // Re-get references after cloning
  const cleanForm = document.getElementById('submissionForm');
  const cleanFileUploadArea = document.getElementById('fileUploadArea');
  const cleanVideoFileInput = document.getElementById('videoFile');
  const cleanSelectFileBtn = document.getElementById('selectFileBtn');
  const cleanFilePreview = document.getElementById('filePreview');
  const cleanRemoveFileBtn = document.getElementById('removeFile');

  // File upload area click handler
  cleanFileUploadArea.addEventListener('click', (e) => {
    if (e.target !== cleanSelectFileBtn) {
      cleanVideoFileInput.click();
    }
  });

  // Select file button handler
  cleanSelectFileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    cleanVideoFileInput.click();
  });

  // File input change handler
  cleanVideoFileInput.addEventListener('change', handleFileSelect);

  // Drag and drop handlers
  cleanFileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    cleanFileUploadArea.classList.add('dragover');
  });

  cleanFileUploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    cleanFileUploadArea.classList.remove('dragover');
  });

  cleanFileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    cleanFileUploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        cleanVideoFileInput.files = files;
        handleFileSelect();
      } else {
        alert('Выберите видео файл.');
      }
    }
  });

  // Handle file selection
  function handleFileSelect() {
    const file = cleanVideoFileInput.files[0];
    if (file) {
      selectedFile = file;
      showFilePreview(file);
    }
  }

  // Show file preview
  function showFilePreview(file) {
    const fileName = cleanFilePreview.querySelector('.file-name');
    const fileSize = cleanFilePreview.querySelector('.file-size');
    
    fileName.textContent = file.name;
    fileSize.textContent = videoStorage.formatFileSize(file.size);
    
    cleanFilePreview.style.display = 'block';
    cleanFileUploadArea.style.display = 'none';
  }

  // Remove file handler
  cleanRemoveFileBtn.addEventListener('click', () => {
    selectedFile = null;
    cleanVideoFileInput.value = '';
    cleanFilePreview.style.display = 'none';
    cleanFileUploadArea.style.display = 'block';
  });

  // Create and show upload progress
  function showUploadProgress() {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'upload-progress-container';
    progressContainer.innerHTML = `
      <div class="upload-progress-header">
        <span class="upload-status">Загрузка...</span>
        <span class="upload-percentage">0%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 0%"></div>
      </div>
      <div class="upload-details">
        <span class="upload-speed">0 MB/s</span>
        <span class="upload-eta">Осталось немного...</span>
      </div>
    `;
    
    // Insert progress container after the form
    cleanForm.parentNode.insertBefore(progressContainer, cleanForm.nextSibling);
    return progressContainer;
  }

  // Update upload progress
  function updateUploadProgress(progressContainer, loaded, total, startTime) {
    const percentage = Math.round((loaded / total) * 100);
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    const speed = loaded / elapsed; // bytes per second
    const remaining = total - loaded;
    const eta = remaining / speed; // seconds remaining
    
    // Update progress bar
    const progressFill = progressContainer.querySelector('.progress-fill');
    const percentageSpan = progressContainer.querySelector('.upload-percentage');
    const speedSpan = progressContainer.querySelector('.upload-speed');
    const etaSpan = progressContainer.querySelector('.upload-eta');
    
    progressFill.style.width = `${percentage}%`;
    percentageSpan.textContent = `${percentage}%`;
    
    // Format speed
    const speedMB = speed / (1024 * 1024);
    speedSpan.textContent = `${speedMB.toFixed(1)} MB/s`;
    
    // Format ETA
    if (eta > 0 && eta < Infinity) {
      const minutes = Math.floor(eta / 60);
      const seconds = Math.floor(eta % 60);
      etaSpan.textContent = minutes > 0 ? `${minutes}м ${seconds}с осталось` : `${seconds}с осталось`;
    } else {
      etaSpan.textContent = 'Осталось немного...';
    }
  }

  // Hide upload progress
  function hideUploadProgress() {
    const progressContainer = document.querySelector('.upload-progress-container');
    if (progressContainer) {
      progressContainer.remove();
    }
  }
  // Form submission handler
  cleanForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Выберите видео файл.');
      return;
    }

    const submitBtn = cleanForm.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    let progressContainer = null;
    
    try {
      // Show loading state
      submitBtn.textContent = 'Подготовка...';
      submitBtn.disabled = true;

      // Get form data
      const formData = new FormData(cleanForm);
      const videoTitle = formData.get('videoTitle').trim();
      const teamCount = formData.get('teamCount');

      if (!videoTitle) {
        throw new Error('Напишите название видео.');
      }

      // Show upload progress
      progressContainer = showUploadProgress();
      submitBtn.textContent = 'Загрузка...';

      // Upload video with progress tracking
      const uploadResult = await videoStorage.uploadVideoWithProgress(
        selectedFile,
        (loaded, total, startTime) => {
          updateUploadProgress(progressContainer, loaded, total, startTime);
        }
      );

      // Update progress to show completion
      const statusSpan = progressContainer.querySelector('.upload-status');
      statusSpan.textContent = 'Загружено. Сохраняем...';

      // Prepare submission data for edge function
      const submissionData = {
        video_title: videoTitle,
        team_count: parseInt(teamCount),
        video_url: uploadResult.publicUrl,
        full_name: userParams.full_name || null,
        username: userParams.username || null,
        tg_id: userParams.tg_id || null
      };

      // Call edge function
      submitBtn.textContent = 'Сохраняем...';
      const apiUrl = `${window.VITE_SUPABASE_URL}/functions/v1/submit-video`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit video');
      }

      // Hide progress and show success
      hideUploadProgress();

      // Show success modal
      showSuccessModal();

      // Reset form
      cleanForm.reset();
      cleanRemoveFileBtn.click();
      
    } catch (error) {
      console.error('Submission error:', error);
      hideUploadProgress();
      alert(error.message || 'Failed to submit video. Please try again.');
    } finally {
      // Reset button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  // Show success modal
  function showSuccessModal() {
    successModal.style.display = 'flex';
    
    // Close modal when clicking outside
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        successModal.style.display = 'none';
      }
    });
  }
}