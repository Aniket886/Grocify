import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="card narrow">
      <h2>Page not found</h2>
      <p>We could not find that page.</p>
      <Link to="/">Back to home</Link>
    </div>
  );
}
