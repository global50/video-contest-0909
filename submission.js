// Submission form functionality
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('submissionForm');
  const fileUploadArea = document.getElementById('fileUploadArea');
  const videoFileInput = document.getElementById('videoFile');
  const selectFileBtn = document.getElementById('selectFileBtn');
  const filePreview = document.getElementById('filePreview');
  const removeFileBtn = document.getElementById('removeFile');
  const successModal = document.getElementById('successModal');

  let selectedFile = null;

  // File upload area click handler
  fileUploadArea.addEventListener('click', (e) => {
    if (e.target !== selectFileBtn) {
      videoFileInput.click();
    }
  });

  // Select file button handler
  selectFileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    videoFileInput.click();
  });

  // File input change handler
  videoFileInput.addEventListener('change', handleFileSelect);

  // Drag and drop handlers
  fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
  });

  fileUploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
  });

  fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        videoFileInput.files = files;
        handleFileSelect();
      } else {
        alert('Please select a valid video file.');
      }
    }
  });

  // Handle file selection
  function handleFileSelect() {
    const file = videoFileInput.files[0];
    if (file) {
      selectedFile = file;
      showFilePreview(file);
    }
  }

  // Show file preview
  function showFilePreview(file) {
    const fileName = filePreview.querySelector('.file-name');
    const fileSize = filePreview.querySelector('.file-size');
    
    fileName.textContent = file.name;
    fileSize.textContent = videoStorage.formatFileSize(file.size);
    
    filePreview.style.display = 'block';
    fileUploadArea.style.display = 'none';
  }

  // Remove file handler
  removeFileBtn.addEventListener('click', () => {
    selectedFile = null;
    videoFileInput.value = '';
    filePreview.style.display = 'none';
    fileUploadArea.style.display = 'block';
  });

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Please select a video file.');
      return;
    }

    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    try {
      // Show loading state
      submitBtn.textContent = 'Uploading...';
      submitBtn.disabled = true;

      // Get form data
      const formData = new FormData(form);
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
      form.reset();
      removeFileBtn.click();
      
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

  // Validate file size (optional - can be adjusted based on requirements)
  function validateFileSize(file, maxSizeMB = 500) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new Error(`File size should be less than ${maxSizeMB}MB`);
    }
  }
});