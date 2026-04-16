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
    if (days === 0) return 'bg-red-50 text-red-700 border border-red-200';
    if (days <= 2) return 'bg-orange-50 text-orange-700 border border-orange-200';
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  };

  const getDaysText = (days) => {
    if (days === 0) return '今天';
    if (days === 1) return '明天';
    return `${days} 天后`;
  };

  const statCards = [
    {
      label: '本月预计支出',
      value: monthlyExpenses ? formatCurrency(monthlyExpenses.total) : '¥0.00',
      icon: '💰',
      gradient: 'from-indigo-500 to-blue-500',
      bg: 'bg-indigo-50',
    },
    {
      label: '活跃订阅数',
      value: monthlyExpenses ? monthlyExpenses.count : 0,
      icon: '📋',
      gradient: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-50',
    },
    {
      label: '7 天内待续费',
      value: upcomingSubscriptions.length,
      icon: '⏰',
      gradient: 'from-orange-500 to-amber-500',
      bg: 'bg-orange-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center">
          <span className="text-2xl mr-3">⚠️</span>
          <div>
            <p className="font-medium text-red-800">发生错误</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">仪表盘</h2>
          <p className="text-slate-500 mt-1">查看您的订阅支出概览</p>
        </div>
        <Link
          to="/subscriptions"
          className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
        >
          <span className="mr-2">+</span>
          添加订阅
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className={`h-1 bg-gradient-to-r ${card.gradient}`}></div>
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">
                    {card.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center`}>
                  <span className="text-2xl">{card.icon}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xl mr-3">⏰</span>
              <h3 className="text-lg font-semibold text-slate-900">7 天内待续费项目</h3>
            </div>
            <span className="text-sm text-slate-500">
              共 {upcomingSubscriptions.length} 项
            </span>
          </div>
        </div>

        {upcomingSubscriptions.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl">🎉</span>
            </div>
            <h4 className="text-base font-medium text-slate-900 mb-2">
              未来 7 天没有待续费的订阅
            </h4>
            <p className="text-slate-500 text-sm mb-6">
              您的订阅状态良好，暂无即将到期的项目
            </p>
            <Link
              to="/subscriptions"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              管理所有订阅
              <span className="ml-1">→</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcomingSubscriptions.map((sub) => {
              const daysUntil = getDaysUntil(sub.next_charge_date);
              return (
                <div
                  key={sub.id}
                  className="px-6 py-5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                      <div className="flex-shrink-0 w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mr-4">
                        <span className="text-xl">📦</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-semibold text-slate-900 truncate">
                          {sub.name}
                        </h4>
                        <div className="flex items-center mt-1.5 text-sm text-slate-500">
                          <span>{formatDate(sub.next_charge_date)}</span>
                          {sub.category && (
                            <>
                              <span className="mx-2 text-slate-300">·</span>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                                {sub.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center ml-4">
                      <div className="text-right mr-5">
                        <p className="text-lg font-bold text-slate-900">
                          {formatCurrency(sub.amount)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {getCycleShortLabel(sub.cycle_type)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${getDaysBadgeClass(
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
