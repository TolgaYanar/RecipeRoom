import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-gray-100 mb-4">404</h1>
        <p className="text-gray-500 text-lg mb-6">Page not found.</p>
        <Link to="/" className="text-amber-600 hover:underline text-sm">← Back to Home</Link>
      </div>
    </div>
  );
}
