// Simple client-side router for the video contest application
class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    
    // Listen for browser navigation
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });
    
    // Handle initial load
    this.handleRoute();
  }

  // Register a route with its handler
  addRoute(path, handler) {
    this.routes[path] = handler;
  }

  // Navigate to a specific route
  navigate(path) {
    window.history.pushState({}, '', path);
    this.handleRoute();
  }

  // Handle the current route
  handleRoute() {
    const path = window.location.pathname;
    this.currentRoute = path;
    
    // Find matching route
    const handler = this.routes[path] || this.routes['/'];
    
    if (handler) {
      handler();
    } else {
      // Default to home if route not found
      this.navigate('/');
    }
  }

  // Get current route
  getCurrentRoute() {
    return this.currentRoute;
  }
}

// Create global router instance
window.router = new Router();