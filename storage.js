// Storage utility for managing video contest submissions
class VideoContestStorage {
  constructor() {
    this.storageKey = 'videoContestSubmissions';
  }

  // Get all submissions from localStorage
  getAllSubmissions() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading submissions from storage:', error);
      return [];
    }
  }

  // Save a new submission
  saveSubmission(submission) {
    try {
      const submissions = this.getAllSubmissions();
      const newSubmission = {
        id: Date.now().toString(),
        title: submission.title,
        teamCount: parseInt(submission.teamCount),
        fileName: submission.fileName,
        fileSize: submission.fileSize,
        fileType: submission.fileType,
        videoData: submission.videoData, // Base64 encoded video data
        submittedAt: new Date().toISOString()
      };
      
      submissions.push(newSubmission);
      localStorage.setItem(this.storageKey, JSON.stringify(submissions));
      return newSubmission;
    } catch (error) {
      console.error('Error saving submission:', error);
      throw new Error('Failed to save submission. Please try again.');
    }
  }

  // Delete a submission by ID
  deleteSubmission(id) {
    try {
      const submissions = this.getAllSubmissions();
      const filteredSubmissions = submissions.filter(sub => sub.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredSubmissions));
      return true;
    } catch (error) {
      console.error('Error deleting submission:', error);
      return false;
    }
  }

  // Clear all submissions
  clearAllSubmissions() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Error clearing submissions:', error);
      return false;
    }
  }

  // Get submission statistics
  getStats() {
    const submissions = this.getAllSubmissions();
    return {
      totalSubmissions: submissions.length,
      totalParticipants: submissions.reduce((sum, sub) => sum + sub.teamCount, 0)
    };
  }

  // Convert file to base64 for storage
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
}

// Create global storage instance
window.videoStorage = new VideoContestStorage();