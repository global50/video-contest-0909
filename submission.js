// Submission form functionality - now called by router
function initializeSubmissionForm() {
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
        alert('Please select a valid video file.');
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

  // Form submission handler
  cleanForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Please select a video file.');
      return;
    }

    const submitBtn = cleanForm.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    try {
      // Show loading state
      submitBtn.textContent = 'Uploading...';
      submitBtn.disabled = true;

      // Get form data
      const formData = new FormData(cleanForm);
      const videoTitle = formData.get('videoTitle').trim();
      const teamCount = formData.get('teamCount');

      if (!videoTitle) {
        throw new Error('Please enter a video title.');
      }

      // Convert file to base64 for storage
      const videoData = await videoStorage.fileToBase64(selectedFile);

      // Create submission object
      const submission = {
        title: videoTitle,
        teamCount: teamCount,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        videoData: videoData
      };

      // Save submission
      videoStorage.saveSubmission(submission);

      // Show success modal
      showSuccessModal();

      // Reset form
      cleanForm.reset();
      cleanRemoveFileBtn.click();
      
    } catch (error) {
      console.error('Submission error:', error);
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