import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout({ children }) {
  return (
    <div className="d-flex">
      <Sidebar />
      <div className="main-content flex-grow-1">
        <Header />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
