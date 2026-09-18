import { Link, useLocation } from 'react-router-dom';
import './adminTabs.css';

export const AdminTabs = () => {
  const location = useLocation();

  return (
    <div className="adminTabs">
      <Link
        to="/admin/users"
        className={location.pathname === '/admin/users' ? 'adminTab adminTabActive' : 'adminTab'}
      >
        Users
      </Link>
      <Link
        to="/admin/contact"
        className={location.pathname === '/admin/contact' ? 'adminTab adminTabActive' : 'adminTab'}
      >
        Messages
      </Link>
    </div>
  );
};
