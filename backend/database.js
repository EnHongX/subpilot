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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

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

const getAllSubscriptions = () => {
  const subscriptions = db.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all();
  return subscriptions.map(sub => ({
    ...sub,
    next_charge_date: calculateNextChargeDate(sub.start_date, sub.cycle_type)
  }));
};

const getSubscriptionById = (id) => {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  if (!sub) return null;
  return {
    ...sub,
    next_charge_date: calculateNextChargeDate(sub.start_date, sub.cycle_type)
  };
};

const createSubscription = (subscription) => {
  const { name, amount, currency, cycle_type, start_date, description, category } = subscription;
  const next_charge_date = calculateNextChargeDate(start_date, cycle_type);

  const stmt = db.prepare(`
    INSERT INTO subscriptions (name, amount, currency, cycle_type, start_date, next_charge_date, description, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(name, amount, currency || 'CNY', cycle_type, start_date, next_charge_date, description, category);
  return getSubscriptionById(result.lastInsertRowid);
};

const updateSubscription = (id, subscription) => {
  const { name, amount, currency, cycle_type, start_date, description, category } = subscription;
  const next_charge_date = calculateNextChargeDate(start_date, cycle_type);

  const stmt = db.prepare(`
    UPDATE subscriptions 
    SET name = ?, amount = ?, currency = ?, cycle_type = ?, start_date = ?, next_charge_date = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(name, amount, currency || 'CNY', cycle_type, start_date, next_charge_date, description, category, id);
  return getSubscriptionById(id);
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

  let totalMonthly = 0;

  subscriptions.forEach(sub => {
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
    totalMonthly += monthlyAmount;
  });

  return {
    total: Math.round(totalMonthly * 100) / 100,
    count: subscriptions.length
  };
};

const getUpcomingSubscriptions = (days = 7) => {
  const subscriptions = getAllSubscriptions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  const upcoming = subscriptions.filter(sub => {
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

  const paidTotal = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  const allSubscriptions = getAllSubscriptions();
  today.setHours(0, 0, 0, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const pendingSubscriptions = allSubscriptions.filter(sub => {
    const nextCharge = new Date(sub.next_charge_date);
    return nextCharge >= today && nextCharge <= monthEnd;
  });

  const pendingTotal = pendingSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);

  return {
    paid: {
      count: paidPayments.length,
      total: Math.round(paidTotal * 100) / 100,
      payments: paidPayments
    },
    pending: {
      count: pendingSubscriptions.length,
      total: Math.round(pendingTotal * 100) / 100,
      subscriptions: pendingSubscriptions
    },
    month: {
      year: currentYear,
      month: currentMonth + 1
    }
  };
};

module.exports = {
  db,
  calculateNextChargeDate,
  calculateNextChargeDateFromDate,
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getMonthlyExpenses,
  getUpcomingSubscriptions,
  recordPayment,
  getPaymentHistory,
  getPaymentHistoryCount,
  getMonthlyPaymentStats
};
