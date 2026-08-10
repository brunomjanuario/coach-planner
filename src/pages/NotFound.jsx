import { Link } from "react-router-dom";

/**
 * Catch-all for any authenticated path that matches none of the app's
 * defined routes (feature 38) — previously rendered a blank <main> with no
 * feedback at all.
 */
export default function NotFound() {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">Page not found</h1>
      <p className="text-sm text-gray-400 mb-3">
        There's nothing here. The page you're looking for doesn't exist or
        may have moved.
      </p>
      <Link to="/" className="text-blue-400 underline focus:outline-2 focus:outline-blue-500">
        Back to Home
      </Link>
    </div>
  );
}
