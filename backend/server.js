const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const {
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getMonthlyExpenses,
  getUpcomingSubscriptions
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
    const { name, amount, cycle_type, start_date } = req.body;
    
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

    const subscription = updateSubscription(req.params.id, req.body);
    res.json({ success: true, data: subscription });
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
