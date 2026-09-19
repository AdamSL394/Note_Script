import { Link } from 'react-router-dom';
import './notFound.css';

const NotFound = () => {
  return (
    <div className="notFoundPage">
      <div className="notFoundContent">
        <p className="notFoundCode">404</p>
        <h1 className="notFoundHeading">Page not found</h1>
        <p className="notFoundText">
          There&apos;s nothing here. The page may have moved, or the link might be wrong.
        </p>
        <Link className="notFoundLink" to="/">
          ← Back to Note Script
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
