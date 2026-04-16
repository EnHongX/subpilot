import { useState, useEffect } from 'react';
import { subscriptionAPI } from '../services/api';
import { formatCurrency, formatDate, getCycleLabel, getCycleShortLabel, getDaysUntil } from '../utils/helpers';

const defaultFormData = {
  name: '',
  amount: '',
  currency: 'CNY',
  cycle_type: 'monthly',
  start_date: new Date().toISOString().split('T')[0],
  description: '',
  category: '',
};

const cycleOptions = [
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季度' },
  { value: 'yearly', label: '每年' },
];

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getAll();
      if (response.data.success) {
        setSubscriptions(response.data.data);
      }
    } catch (err) {
      setError(err.message || '获取订阅列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const openEditModal = (subscription) => {
    setEditingId(subscription.id);
    setFormData({
      name: subscription.name,
      amount: subscription.amount,
      currency: subscription.currency || 'CNY',
      cycle_type: subscription.cycle_type,
      start_date: subscription.start_date,
      description: subscription.description || '',
      category: subscription.category || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        await subscriptionAPI.update(editingId, formData);
      } else {
        await subscriptionAPI.create(formData);
      }
      setShowModal(false);
      fetchSubscriptions();
    } catch (err) {
      alert(err.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await subscriptionAPI.delete(id);
      setShowDeleteConfirm(null);
      fetchSubscriptions();
    } catch (err) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const getDaysBadgeClass = (days) => {
    if (days < 0) return 'bg-slate-100 text-slate-600 border border-slate-200';
    if (days === 0) return 'bg-red-50 text-red-700 border border-red-200';
    if (days <= 3) return 'bg-orange-50 text-orange-700 border border-orange-200';
    if (days <= 7) return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  };

  const getCycleBadgeClass = (cycleType) => {
    const classes = {
      weekly: 'bg-blue-50 text-blue-700 border border-blue-200',
      monthly: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      quarterly: 'bg-purple-50 text-purple-700 border border-purple-200',
      yearly: 'bg-teal-50 text-teal-700 border border-teal-200',
    };
    return classes[cycleType] || 'bg-slate-100 text-slate-600';
  };

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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">订阅管理</h2>
          <p className="text-slate-500 mt-1">管理您的所有订阅和固定支出</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
        >
          <span className="mr-2">+</span>
          添加订阅
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">📭</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            还没有订阅
          </h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            开始添加您的订阅服务，以便更好地管理和追踪您的定期支出
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
          >
            <span className="mr-2">+</span>
            添加第一个订阅
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    订阅名称
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    金额
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    周期
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    开始日期
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    下次扣费
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => {
                  const daysUntil = getDaysUntil(sub.next_charge_date);
                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mr-4">
                            <span className="text-lg">📦</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {sub.name}
                            </p>
                            {sub.category && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {sub.category}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <p className="text-sm font-bold text-slate-900">
                          {formatCurrency(sub.amount, sub.currency)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {getCycleShortLabel(sub.cycle_type)}
                        </p>
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${getCycleBadgeClass(
                            sub.cycle_type
                          )}`}
                        >
                          {getCycleLabel(sub.cycle_type)}
                        </span>
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm text-slate-600">
                          {formatDate(sub.start_date)}
                        </span>
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-slate-900">
                            {formatDate(sub.next_charge_date)}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium mt-1 ${getDaysBadgeClass(
                              daysUntil
                            )}`}
                          >
                            {daysUntil < 0
                              ? '已过期'
                              : daysUntil === 0
                              ? '今天'
                              : `${daysUntil} 天后`}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openEditModal(sub)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(sub.id)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-lg">{editingId ? '✏️' : '➕'}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {editingId ? '编辑订阅' : '添加订阅'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {editingId ? '修改订阅信息' : '添加新的订阅服务'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  订阅名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="例如：Netflix、Spotify、电费"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    金额 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      ¥
                    </span>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    货币
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                  >
                    <option value="CNY">CNY (¥ 人民币)</option>
                    <option value="USD">USD ($ 美元)</option>
                    <option value="EUR">EUR (€ 欧元)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    扣费周期 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="cycle_type"
                    value={formData.cycle_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                  >
                    {cycleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    开始日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  分类
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="例如：娱乐、工具、音乐、生活缴费"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  备注
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="可选的备注信息"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  {saving ? '保存中...' : editingId ? '保存修改' : '添加订阅'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                确认删除
              </h3>
              <p className="text-slate-500">
                确定要删除这个订阅吗？此操作无法撤销。
              </p>
            </div>
            <div className="flex items-stretch border-t border-slate-200">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <div className="w-px bg-slate-200"></div>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-4 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
