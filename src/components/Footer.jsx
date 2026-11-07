import { Link } from 'react-router-dom';
/* global __APP_VERSION__ */
export default function Footer() {
  return (
    <footer className="site-footer no-print">
      <span><b>Grocify</b> v{__APP_VERSION__}</span>
      <span>Online Grocery E-Commerce System</span>
      <span>UC25CA2303 · GM University</span>
      <Link to="/settings">Settings</Link>
    </footer>
  );
}
