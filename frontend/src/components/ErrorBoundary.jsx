import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-200 mb-4">Oops</h1>
            <p className="text-gray-500 text-lg mb-6">Something went wrong. Please try refreshing the page.</p>
            <Link to="/" className="text-amber-600 hover:underline text-sm">← Back to Home</Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
