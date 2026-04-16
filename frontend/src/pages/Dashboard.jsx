import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { formatCurrency, formatDate, getDaysUntil, getCycleShortLabel } from '../utils/helpers';

const Dashboard = () => {
  const [monthlyExpenses, setMonthlyExpenses] = useState(null);
  const [upcomingSubscriptions, setUpcomingSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expensesRes, upcomingRes] = await Promise.all([
          dashboardAPI.getMonthlyExpenses(),
          dashboardAPI.getUpcoming(7),
        ]);

        if (expensesRes.data.success) {
          setMonthlyExpenses(expensesRes.data.data);
        }
        if (upcomingRes.data.success) {
          setUpcomingSubscriptions(upcomingRes.data.data);
        }
      } catch (err) {
        setError(err.message || '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getDaysBadgeClass = (days) => {
    if (days === 0) return 'bg-red-100 text-red-800';
    if (days <= 2) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getDaysText = (days) => {
    if (days === 0) return '今天';
    if (days === 1) return '明天';
    return `${days} 天后`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">发生错误</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">仪表盘</h2>
          <p className="text-gray-500 mt-1">查看您的订阅支出概览</p>
        </div>
        <Link
          to="/subscriptions"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <span className="mr-2">+</span>
          添加订阅
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-indigo-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">本月预计支出</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {monthlyExpenses ? formatCurrency(monthlyExpenses.total) : '¥0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">活跃订阅数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {monthlyExpenses ? monthlyExpenses.count : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-orange-100 rounded-lg">
              <span className="text-2xl">⏰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">7 天内待续费</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {upcomingSubscriptions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            ⏰ 7 天内待续费项目
          </h3>
        </div>

        {upcomingSubscriptions.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl block mb-4">🎉</span>
            <p className="text-gray-500">未来 7 天没有待续费的订阅</p>
            <Link
              to="/subscriptions"
              className="inline-block mt-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              去添加第一个订阅 →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingSubscriptions.map((sub) => {
              const daysUntil = getDaysUntil(sub.next_charge_date);
              return (
                <div
                  key={sub.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">📦</span>
                      </div>
                      <div>
                        <h4 className="text-base font-medium text-gray-900">
                          {sub.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {formatDate(sub.next_charge_date)}
                          {sub.category && (
                            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {sub.category}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-base font-semibold text-gray-900">
                          {formatCurrency(sub.amount)}
                          <span className="text-xs text-gray-500 font-normal ml-1">
                            {getCycleShortLabel(sub.cycle_type)}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getDaysBadgeClass(
                          daysUntil
                        )}`}
                      >
                        {getDaysText(daysUntil)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
