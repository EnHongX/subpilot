const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
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
  getSubscriptionLatestPriceChange
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Subscription manager API is running' });
});

app.get('/api/subscriptions', (req, res) => {
  try {
    const subscriptions = getAllSubscriptions();
    res.json({ success: true, data: subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/subscriptions/:id', (req, res) => {
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

app.post('/api/subscriptions', (req, res) => {
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

app.put('/api/subscriptions/:id', (req, res) => {
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

app.delete('/api/subscriptions/:id', (req, res) => {
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

app.patch('/api/subscriptions/:id/status', (req, res) => {
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

app.get('/api/dashboard/monthly-expenses', (req, res) => {
  try {
    const expenses = getMonthlyExpenses();
    res.json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/upcoming', (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 7;
    const upcoming = getUpcomingSubscriptions(days);
    res.json({ success: true, data: upcoming });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/payment-stats', (req, res) => {
  try {
    const stats = getMonthlyPaymentStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/subscriptions/:id/pay', (req, res) => {
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

app.get('/api/payments', (req, res) => {
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

app.get('/api/subscriptions/:id/price-history', (req, res) => {
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

app.get('/api/price-history', (req, res) => {
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

app.get('/api/dashboard/recent-price-increases', (req, res) => {
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

app.get('/api/subscriptions/:id/latest-price-change', (req, res) => {
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
