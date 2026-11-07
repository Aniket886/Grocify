import { Component } from 'react';

// If a screen crashes, show a friendly message instead of a blank page.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Screen crashed:', error); // eslint-disable-line no-console
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="card narrow">
        <h2>Something went wrong</h2>
        <p>This page hit a problem. Please reload it, or go back to the home page.</p>
        <div className="row">
          <button className="primary" onClick={() => window.location.reload()}>Reload</button>
          <a href="/">Home</a>
        </div>
      </div>
    );
  }
}
