import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '仪表盘', icon: '📊' },
    { path: '/subscriptions', label: '订阅管理', icon: '📋' },
  ];

  const formatDateDisplay = () => {
    const now = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekDay = weekDays[now.getDay()];
    return `${month}月${day}日 ${weekDay}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center group">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <span className="text-lg">💳</span>
                </div>
                <h1 className="ml-3 text-lg font-bold text-slate-800 tracking-tight">
                  订阅管理台
                </h1>
              </Link>

              <div className="hidden sm:ml-10 sm:flex sm:items-center sm:space-x-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <span className="mr-2 text-base">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center">
              <div className="hidden sm:flex items-center space-x-3">
                <div className="flex items-center text-sm text-slate-500">
                  <span className="mr-2">📅</span>
                  <span>{formatDateDisplay()}</span>
                </div>
                <div className="w-px h-5 bg-slate-200"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">U</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sm:hidden border-t border-slate-100 bg-white">
          <div className="flex px-2 py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex-1 flex flex-col items-center justify-center py-2.5 mx-1 rounded-xl transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl mb-0.5">{item.icon}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
