const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'subscriptions.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'CNY',
    cycle_type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    next_charge_date TEXT,
    description TEXT,
    category TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

try {
  db.exec('ALTER TABLE subscriptions ADD COLUMN status TEXT DEFAULT "active"');
} catch (e) {
}

try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)');
} catch (e) {
}

db.exec(`
  CREATE TABLE IF NOT EXISTS payment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    subscription_name TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'CNY',
    cycle_type TEXT NOT NULL,
    payment_date TEXT NOT NULL,
    next_charge_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id 
  ON payment_history(subscription_id)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date 
  ON payment_history(payment_date)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    subscription_name TEXT NOT NULL,
    old_amount REAL NOT NULL,
    new_amount REAL NOT NULL,
    currency TEXT DEFAULT 'CNY',
    effective_date TEXT NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_price_history_subscription_id 
  ON price_history(subscription_id)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_price_history_created_at 
  ON price_history(created_at)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_price_history_effective_date 
  ON price_history(effective_date)
`);

const calculateNextChargeDate = (startDate, cycleType) => {
  const date = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date >= today) {
    return date.toISOString().split('T')[0];
  }

  let nextDate = new Date(date);

  while (nextDate < today) {
    switch (cycleType) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      default:
        return null;
    }
  }

  return nextDate.toISOString().split('T')[0];
};

const getEffectiveNextChargeDate = (sub) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (sub.next_charge_date) {
    const storedDate = new Date(sub.next_charge_date);
    if (storedDate >= today) {
      return sub.next_charge_date;
    }
  }

  return calculateNextChargeDate(sub.start_date, sub.cycle_type);
};

const getAllSubscriptions = () => {
  const subscriptions = db.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all();
  return subscriptions.map(sub => {
    const latestPriceChange = getSubscriptionLatestPriceChange(sub.id);
    return {
      ...sub,
      next_charge_date: getEffectiveNextChargeDate(sub),
      latest_price_change: latestPriceChange
    };
  });
};

const getSubscriptionById = (id) => {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  if (!sub) return null;
  const latestPriceChange = getSubscriptionLatestPriceChange(id);
  return {
    ...sub,
    next_charge_date: getEffectiveNextChargeDate(sub),
    latest_price_change: latestPriceChange
  };
};

const createSubscription = (subscription) => {
  const { name, amount, currency, cycle_type, start_date, description, category, status } = subscription;
  const next_charge_date = calculateNextChargeDate(start_date, cycle_type);

  const stmt = db.prepare(`
    INSERT INTO subscriptions (name, amount, currency, cycle_type, start_date, next_charge_date, description, category, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(name, amount, currency || 'CNY', cycle_type, start_date, next_charge_date, description, category, status || 'active');
  return getSubscriptionById(result.lastInsertRowid);
};

const updateSubscription = (id, subscription, options = {}) => {
  const { name, amount, currency, cycle_type, start_date, description, category, status } = subscription;
  const { price_change_note, effective_date } = options;
  
  const existing = getSubscriptionById(id);
  if (!existing) {
    return { success: false, error: 'Subscription not found' };
  }

  const oldAmount = existing.amount;
  const newAmount = amount;
  const currencyChanged = currency && currency !== existing.currency;

  const next_charge_date = calculateNextChargeDate(start_date, cycle_type);

  const stmt = db.prepare(`
    UPDATE subscriptions 
    SET name = ?, amount = ?, currency = ?, cycle_type = ?, start_date = ?, next_charge_date = ?, description = ?, category = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(name, amount, currency || 'CNY', cycle_type, start_date, next_charge_date, description, category, status || 'active', id);

  if (oldAmount !== newAmount || currencyChanged) {
    recordPriceChange(
      id,
      oldAmount,
      newAmount,
      currency || existing.currency || 'CNY',
      price_change_note || null,
      effective_date || null
    );
  }

  const updated = getSubscriptionById(id);
  return { 
    success: true, 
    data: updated,
    priceChanged: oldAmount !== newAmount || currencyChanged,
    oldAmount,
    newAmount
  };
};

const updateSubscriptionStatus = (id, status) => {
  const validStatuses = ['active', 'paused', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return { success: false, error: 'Invalid status. Must be one of: active, paused, cancelled' };
  }

  const existing = getSubscriptionById(id);
  if (!existing) {
    return { success: false, error: 'Subscription not found' };
  }

  const stmt = db.prepare(`
    UPDATE subscriptions 
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(status, id);
  return { success: true, data: getSubscriptionById(id) };
};

const deleteSubscription = (id) => {
  const stmt = db.prepare('DELETE FROM subscriptions WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
};

const getMonthlyExpenses = () => {
  const subscriptions = getAllSubscriptions();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');

  const currencyTotals = {
    CNY: 0,
    USD: 0,
    EUR: 0
  };

  activeSubscriptions.forEach(sub => {
    let monthlyAmount = 0;
    switch (sub.cycle_type) {
      case 'weekly':
        monthlyAmount = sub.amount * 4;
        break;
      case 'monthly':
        monthlyAmount = sub.amount;
        break;
      case 'quarterly':
        monthlyAmount = sub.amount / 3;
        break;
      case 'yearly':
        monthlyAmount = sub.amount / 12;
        break;
    }
    const currency = sub.currency || 'CNY';
    if (currencyTotals.hasOwnProperty(currency)) {
      currencyTotals[currency] += monthlyAmount;
    } else {
      currencyTotals.CNY += monthlyAmount;
    }
  });

  return {
    total: Math.round((currencyTotals.CNY + currencyTotals.USD + currencyTotals.EUR) * 100) / 100,
    count: activeSubscriptions.length,
    byCurrency: {
      CNY: Math.round(currencyTotals.CNY * 100) / 100,
      USD: Math.round(currencyTotals.USD * 100) / 100,
      EUR: Math.round(currencyTotals.EUR * 100) / 100
    }
  };
};

const getUpcomingSubscriptions = (days = 7) => {
  const subscriptions = getAllSubscriptions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  const upcoming = subscriptions.filter(sub => {
    if (sub.status !== 'active') return false;
    const nextCharge = new Date(sub.next_charge_date);
    return nextCharge >= today && nextCharge <= futureDate;
  });

  return upcoming.sort((a, b) => new Date(a.next_charge_date) - new Date(b.next_charge_date));
};

const calculateNextChargeDateFromDate = (fromDate, cycleType) => {
  const date = new Date(fromDate);
  
  switch (cycleType) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return null;
  }
  
  return date.toISOString().split('T')[0];
};

const recordPayment = (subscriptionId, paymentDate = null, amount = null) => {
  const subscription = getSubscriptionById(subscriptionId);
  if (!subscription) {
    return { success: false, error: 'Subscription not found' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const actualPaymentDate = paymentDate || today.toISOString().split('T')[0];
  const actualAmount = amount !== null ? amount : subscription.amount;

  const currentNextCharge = new Date(subscription.next_charge_date);
  const newNextChargeDate = calculateNextChargeDateFromDate(
    subscription.next_charge_date,
    subscription.cycle_type
  );

  db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO payment_history (
        subscription_id, subscription_name, amount, currency, 
        cycle_type, payment_date, next_charge_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      subscription.id,
      subscription.name,
      actualAmount,
      subscription.currency,
      subscription.cycle_type,
      actualPaymentDate,
      newNextChargeDate
    );

    const updateStmt = db.prepare(`
      UPDATE subscriptions 
      SET next_charge_date = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    updateStmt.run(newNextChargeDate, subscription.id);
  })();

  return {
    success: true,
    data: {
      subscription: getSubscriptionById(subscriptionId),
      payment: {
        subscription_id: subscription.id,
        subscription_name: subscription.name,
        amount: actualAmount,
        currency: subscription.currency,
        cycle_type: subscription.cycle_type,
        payment_date: actualPaymentDate,
        next_charge_date: newNextChargeDate
      }
    }
  };
};

const getPaymentHistory = (options = {}) => {
  const { subscriptionId, startDate, endDate, limit, offset } = options;
  
  let query = `SELECT * FROM payment_history WHERE 1=1`;
  const params = [];

  if (subscriptionId) {
    query += ` AND subscription_id = ?`;
    params.push(subscriptionId);
  }

  if (startDate) {
    query += ` AND payment_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND payment_date <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY payment_date DESC, created_at DESC`;

  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  if (offset) {
    query += ` OFFSET ?`;
    params.push(offset);
  }

  const payments = db.prepare(query).all(...params);
  return payments;
};

const getPaymentHistoryCount = (options = {}) => {
  const { subscriptionId, startDate, endDate } = options;
  
  let query = `SELECT COUNT(*) as total FROM payment_history WHERE 1=1`;
  const params = [];

  if (subscriptionId) {
    query += ` AND subscription_id = ?`;
    params.push(subscriptionId);
  }

  if (startDate) {
    query += ` AND payment_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND payment_date <= ?`;
    params.push(endDate);
  }

  const result = db.prepare(query).get(...params);
  return result.total;
};

const getMonthlyPaymentStats = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  const monthStartStr = monthStart.toISOString().split('T')[0];
  const monthEndStr = monthEnd.toISOString().split('T')[0];

  const paidPayments = db.prepare(`
    SELECT * FROM payment_history 
    WHERE payment_date >= ? AND payment_date <= ?
  `).all(monthStartStr, monthEndStr);

  const paidByCurrency = {
    CNY: { total: 0, count: 0 },
    USD: { total: 0, count: 0 },
    EUR: { total: 0, count: 0 }
  };

  paidPayments.forEach(p => {
    const currency = p.currency || 'CNY';
    if (paidByCurrency.hasOwnProperty(currency)) {
      paidByCurrency[currency].total += p.amount;
      paidByCurrency[currency].count += 1;
    } else {
      paidByCurrency.CNY.total += p.amount;
      paidByCurrency.CNY.count += 1;
    }
  });

  const allSubscriptions = getAllSubscriptions();
  today.setHours(0, 0, 0, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const pendingSubscriptions = allSubscriptions.filter(sub => {
    if (sub.status !== 'active') return false;
    const nextCharge = new Date(sub.next_charge_date);
    return nextCharge >= today && nextCharge <= monthEnd;
  });

  const pendingByCurrency = {
    CNY: { total: 0, count: 0 },
    USD: { total: 0, count: 0 },
    EUR: { total: 0, count: 0 }
  };

  pendingSubscriptions.forEach(sub => {
    const currency = sub.currency || 'CNY';
    if (pendingByCurrency.hasOwnProperty(currency)) {
      pendingByCurrency[currency].total += sub.amount;
      pendingByCurrency[currency].count += 1;
    } else {
      pendingByCurrency.CNY.total += sub.amount;
      pendingByCurrency.CNY.count += 1;
    }
  });

  return {
    paid: {
      count: paidPayments.length,
      total: Math.round(paidPayments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100,
      payments: paidPayments,
      byCurrency: {
        CNY: { total: Math.round(paidByCurrency.CNY.total * 100) / 100, count: paidByCurrency.CNY.count },
        USD: { total: Math.round(paidByCurrency.USD.total * 100) / 100, count: paidByCurrency.USD.count },
        EUR: { total: Math.round(paidByCurrency.EUR.total * 100) / 100, count: paidByCurrency.EUR.count }
      }
    },
    pending: {
      count: pendingSubscriptions.length,
      total: Math.round(pendingSubscriptions.reduce((sum, sub) => sum + sub.amount, 0) * 100) / 100,
      subscriptions: pendingSubscriptions,
      byCurrency: {
        CNY: { total: Math.round(pendingByCurrency.CNY.total * 100) / 100, count: pendingByCurrency.CNY.count },
        USD: { total: Math.round(pendingByCurrency.USD.total * 100) / 100, count: pendingByCurrency.USD.count },
        EUR: { total: Math.round(pendingByCurrency.EUR.total * 100) / 100, count: pendingByCurrency.EUR.count }
      }
    },
    month: {
      year: currentYear,
      month: currentMonth + 1
    }
  };
};

const recordPriceChange = (subscriptionId, oldAmount, newAmount, currency, note = null, effectiveDate = null) => {
  const subscription = getSubscriptionById(subscriptionId);
  if (!subscription) {
    return { success: false, error: 'Subscription not found' };
  }

  if (oldAmount === newAmount) {
    return { success: true, skipped: true, message: 'Price has not changed' };
  }

  const today = new Date();
  const actualEffectiveDate = effectiveDate || today.toISOString().split('T')[0];

  const stmt = db.prepare(`
    INSERT INTO price_history (
      subscription_id, subscription_name, old_amount, new_amount, 
      currency, effective_date, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    subscriptionId,
    subscription.name,
    oldAmount,
    newAmount,
    currency || subscription.currency || 'CNY',
    actualEffectiveDate,
    note
  );

  return { success: true };
};

const getPriceHistoryBySubscriptionId = (subscriptionId) => {
  const history = db.prepare(`
    SELECT * FROM price_history 
    WHERE subscription_id = ? 
    ORDER BY effective_date DESC, created_at DESC
  `).all(subscriptionId);
  return history;
};

const getPriceHistory = (options = {}) => {
  const { subscriptionId, startDate, endDate, limit, offset } = options;
  
  let query = `SELECT * FROM price_history WHERE 1=1`;
  const params = [];

  if (subscriptionId) {
    query += ` AND subscription_id = ?`;
    params.push(subscriptionId);
  }

  if (startDate) {
    query += ` AND effective_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND effective_date <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY effective_date DESC, created_at DESC`;

  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  if (offset) {
    query += ` OFFSET ?`;
    params.push(offset);
  }

  const history = db.prepare(query).all(...params);
  return history;
};

const getPriceHistoryCount = (options = {}) => {
  const { subscriptionId, startDate, endDate } = options;
  
  let query = `SELECT COUNT(*) as total FROM price_history WHERE 1=1`;
  const params = [];

  if (subscriptionId) {
    query += ` AND subscription_id = ?`;
    params.push(subscriptionId);
  }

  if (startDate) {
    query += ` AND effective_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND effective_date <= ?`;
    params.push(endDate);
  }

  const result = db.prepare(query).get(...params);
  return result.total;
};

const getRecentPriceIncreases = (days = 30, limit = 20) => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const increases = db.prepare(`
    SELECT ph.*, s.status 
    FROM price_history ph
    LEFT JOIN subscriptions s ON ph.subscription_id = s.id
    WHERE ph.new_amount > ph.old_amount 
    AND ph.effective_date >= ?
    ORDER BY ph.effective_date DESC, ph.created_at DESC
    LIMIT ?
  `).all(startDateStr, limit);

  return increases;
};

const getSubscriptionLatestPriceChange = (subscriptionId) => {
  const latest = db.prepare(`
    SELECT * FROM price_history 
    WHERE subscription_id = ? 
    ORDER BY effective_date DESC, created_at DESC 
    LIMIT 1
  `).get(subscriptionId);
  return latest || null;
};

module.exports = {
  db,
  calculateNextChargeDate,
  calculateNextChargeDateFromDate,
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  updateSubscriptionStatus,
  deleteSubscription,
  getMonthlyExpenses,
  getUpcomingSubscriptions,
  recordPayment,
  getPaymentHistory,
  getPaymentHistoryCount,
  getMonthlyPaymentStats,
  recordPriceChange,
  getPriceHistoryBySubscriptionId,
  getPriceHistory,
  getPriceHistoryCount,
  getRecentPriceIncreases,
  getSubscriptionLatestPriceChange
};
