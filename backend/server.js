const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const {
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
  getSubscriptionLatestPriceChange,
  createUser,
  getUserById,
  getUserByUsername,
  updateUser
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const SESSION_SECRET = process.env.SESSION_SECRET || 'subpilot-secret-key-2024';

app.use(cookieParser());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());

const validateInput = (value, min, max, fieldName) => {
  if (!value || typeof value !== 'string') {
    return { valid: false, message: `${fieldName}不能为空` };
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    return { valid: false, message: `${fieldName}长度必须为${min}-${max}位` };
  }
  return { valid: true, value: trimmed };
};

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, error: '未登录或登录已过期', needLogin: true });
  }
  next();
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Subscription manager API is running' });
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password } = req.body;

    const usernameCheck = validateInput(username, 2, 8, '用户名');
    if (!usernameCheck.valid) {
      return res.status(400).json({ success: false, error: usernameCheck.message });
    }

    const passwordCheck = validateInput(password, 2, 8, '密码');
    if (!passwordCheck.valid) {
      return res.status(400).json({ success: false, error: passwordCheck.message });
    }

    const existingUser = getUserByUsername(usernameCheck.value);
    if (existingUser) {
      return res.status(400).json({ success: false, error: '用户名已存在' });
    }

    const user = createUser(usernameCheck.value, passwordCheck.value);
    
    req.session.userId = user.id;
    req.session.user = user;

    res.status(201).json({ 
      success: true, 
      message: '注册成功',
      data: user 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
    }

    const user = getUserByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    if (user.password !== password.trim()) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      nickname: user.nickname
    };

    req.session.userId = user.id;
    req.session.user = safeUser;

    res.json({ 
      success: true, 
      message: '登录成功',
      data: safeUser 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: '退出失败' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: '已退出登录' });
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    const user = getUserById(req.session.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/auth/profile', requireAuth, (req, res) => {
  try {
    const { nickname, password } = req.body;
    const updates = {};

    if (nickname !== undefined) {
      const nicknameCheck = validateInput(nickname, 2, 8, '昵称');
      if (!nicknameCheck.valid) {
        return res.status(400).json({ success: false, error: nicknameCheck.message });
      }
      updates.nickname = nicknameCheck.value;
    }

    if (password !== undefined) {
      const passwordCheck = validateInput(password, 2, 8, '密码');
      if (!passwordCheck.valid) {
        return res.status(400).json({ success: false, error: passwordCheck.message });
      }
      updates.password = passwordCheck.value;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的内容' });
    }

    const result = updateUser(req.session.userId, updates);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    res.json({ 
      success: true, 
      message: '更新成功',
      data: result.data 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/subscriptions', requireAuth, (req, res) => {
  try {
    const subscriptions = getAllSubscriptions();
    res.json({ success: true, data: subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/subscriptions/:id', requireAuth, (req, res) => {
  try {
    const subscription = getSubscriptionById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/subscriptions', requireAuth, (req, res) => {
  try {
    const { name, amount, cycle_type, start_date } = req.body;
    
    if (!name || amount === undefined || !cycle_type || !start_date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, amount, cycle_type, and start_date are required' 
      });
    }

    const validCycles = ['weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validCycles.includes(cycle_type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'cycle_type must be one of: weekly, monthly, quarterly, yearly' 
      });
    }

    const subscription = createSubscription(req.body);
    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/subscriptions/:id', requireAuth, (req, res) => {
  try {
    const { name, amount, cycle_type, start_date, price_change_note, effective_date } = req.body;
    
    if (!name || amount === undefined || !cycle_type || !start_date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, amount, cycle_type, and start_date are required' 
      });
    }

    const existing = getSubscriptionById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const result = updateSubscription(req.params.id, req.body, {
      price_change_note,
      effective_date
    });
    
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    res.json({ 
      success: true, 
      data: result.data,
      priceChanged: result.priceChanged,
      oldAmount: result.oldAmount,
      newAmount: result.newAmount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/subscriptions/:id', requireAuth, (req, res) => {
  try {
    const existing = getSubscriptionById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const deleted = deleteSubscription(req.params.id);
    if (deleted) {
      res.json({ success: true, message: 'Subscription deleted' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to delete subscription' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/subscriptions/:id/status', requireAuth, (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const result = updateSubscriptionStatus(req.params.id, status);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/monthly-expenses', requireAuth, (req, res) => {
  try {
    const expenses = getMonthlyExpenses();
    res.json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/upcoming', requireAuth, (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 7;
    const upcoming = getUpcomingSubscriptions(days);
    res.json({ success: true, data: upcoming });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/payment-stats', requireAuth, (req, res) => {
  try {
    const stats = getMonthlyPaymentStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/subscriptions/:id/pay', requireAuth, (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const { payment_date, amount } = req.body;

    if (isNaN(subscriptionId)) {
      return res.status(400).json({ success: false, error: 'Invalid subscription ID' });
    }

    const result = recordPayment(subscriptionId, payment_date, amount);
    
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/payments', requireAuth, (req, res) => {
  try {
    const { subscription_id, start_date, end_date, page = 1, limit = 20 } = req.query;
    
    const options = {};
    if (subscription_id) options.subscriptionId = parseInt(subscription_id);
    if (start_date) options.startDate = start_date;
    if (end_date) options.endDate = end_date;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    options.limit = limitNum;
    options.offset = offset;

    const payments = getPaymentHistory(options);
    const total = getPaymentHistoryCount(options);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/subscriptions/:id/price-history', requireAuth, (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    if (isNaN(subscriptionId)) {
      return res.status(400).json({ success: false, error: 'Invalid subscription ID' });
    }

    const existing = getSubscriptionById(subscriptionId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const history = getPriceHistoryBySubscriptionId(subscriptionId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/price-history', requireAuth, (req, res) => {
  try {
    const { subscription_id, start_date, end_date, page = 1, limit = 20 } = req.query;
    
    const options = {};
    if (subscription_id) options.subscriptionId = parseInt(subscription_id);
    if (start_date) options.startDate = start_date;
    if (end_date) options.endDate = end_date;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    options.limit = limitNum;
    options.offset = offset;

    const history = getPriceHistory(options);
    const total = getPriceHistoryCount(options);

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/recent-price-increases', requireAuth, (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    
    const increases = getRecentPriceIncreases(days, limit);
    
    res.json({
      success: true,
      data: increases
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/subscriptions/:id/latest-price-change', requireAuth, (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    if (isNaN(subscriptionId)) {
      return res.status(400).json({ success: false, error: 'Invalid subscription ID' });
    }

    const existing = getSubscriptionById(subscriptionId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const latest = getSubscriptionLatestPriceChange(subscriptionId);
    
    res.json({
      success: true,
      data: latest
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
