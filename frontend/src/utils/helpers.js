export const formatCurrency = (amount, currency = 'CNY') => {
  const symbols = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${Number(amount).toFixed(2)}`;
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const getDaysUntil = (dateString) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getCycleLabel = (cycleType) => {
  const labels = {
    weekly: '每周',
    monthly: '每月',
    quarterly: '每季度',
    yearly: '每年',
  };
  return labels[cycleType] || cycleType;
};

export const getCycleShortLabel = (cycleType) => {
  const labels = {
    weekly: '/周',
    monthly: '/月',
    quarterly: '/季',
    yearly: '/年',
  };
  return labels[cycleType] || '';
};
