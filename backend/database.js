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

module.exports = {
  db,
  calculateNextChargeDate,
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getMonthlyExpenses,
  getUpcomingSubscriptions
};
