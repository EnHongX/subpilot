import { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Typography,
  Tag,
  Spin,
  Alert,
  Empty,
  DatePicker,
  Select,
  Space,
  Avatar,
  Button,
  Pagination,
} from 'antd';
import {
  HistoryOutlined,
  ReloadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { paymentAPI } from '../services/api';
import {
  formatCurrency,
  formatDate,
  getCycleLabel,
} from '../utils/helpers';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
  });

  const fetchPayments = async (page = 1, limit = 20) => {
    try {
      setLoading(true);
      const params = { page, limit };
      
      if (filters.startDate) {
        params.startDate = filters.startDate.format('YYYY-MM-DD');
      }
      if (filters.endDate) {
        params.endDate = filters.endDate.format('YYYY-MM-DD');
      }

      const response = await paymentAPI.getHistory(params);
      if (response.data.success) {
        setPayments(response.data.data.payments);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      setError(err.message || '获取支付历史失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const handlePageChange = (page, pageSize) => {
    fetchPayments(page, pageSize || 20);
  };

  const handleDateChange = (dates) => {
    if (dates && dates.length === 2) {
      setFilters({
        startDate: dates[0],
        endDate: dates[1],
      });
    } else {
      setFilters({
        startDate: null,
        endDate: null,
      });
    }
  };

  const handleReset = () => {
    setFilters({
      startDate: null,
      endDate: null,
    });
  };

  const getCycleTagColor = (cycleType) => {
    const colors = {
      weekly: 'blue',
      monthly: 'processing',
      quarterly: 'purple',
      yearly: 'cyan',
    };
    return colors[cycleType] || 'default';
  };

  const columns = [
    {
      title: '订阅名称',
      dataIndex: 'subscription_name',
      key: 'subscription_name',
      width: 200,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            size={40}
            style={{
              backgroundColor: '#f0f0f0',
              borderRadius: 10,
              marginRight: 12,
            }}
            icon={<span style={{ fontSize: 18 }}>💳</span>}
          />
          <div>
            <Text strong style={{ fontSize: 14, display: 'block' }}>
              {text}
            </Text>
            <Tag color={getCycleTagColor(record.cycle_type)} style={{ marginTop: 4 }}>
              {getCycleLabel(record.cycle_type)}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: '支付金额',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 120,
      render: (amount, record) => (
        <Text strong style={{ fontSize: 15 }}>
          {formatCurrency(amount, record.currency)}
        </Text>
      ),
    },
    {
      title: '支付日期',
      dataIndex: 'payment_date',
      key: 'payment_date',
      width: 150,
      render: (date) => (
        <div>
          <Text>{formatDate(date)}</Text>
        </div>
      ),
    },
    {
      title: '下次扣费日期',
      dataIndex: 'next_charge_date',
      key: 'next_charge_date',
      width: 150,
      render: (date) => (
        <div>
          <CalendarOutlined style={{ marginRight: 6, color: '#999' }} />
          <Text type="secondary">{formatDate(date)}</Text>
        </div>
      ),
    },
    {
      title: '支付时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date) => {
        const d = new Date(date);
        return (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {d.toLocaleString('zh-CN')}
          </Text>
        );
      },
    },
  ];

  if (loading && payments.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="获取数据失败"
        description={error}
        type="error"
        showIcon
        style={{ borderRadius: 8 }}
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
            支付历史
          </Title>
          <Text type="secondary">查看所有订阅的支付记录</Text>
        </div>
      </div>

      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          marginBottom: 24,
        }}
      >
        <Space wrap>
          <Text type="secondary" style={{ marginRight: 8 }}>
            日期范围：
          </Text>
          <RangePicker
            value={
              filters.startDate && filters.endDate
                ? [filters.startDate, filters.endDate]
                : null
            }
            onChange={handleDateChange}
            placeholder={['开始日期', '结束日期']}
            size="large"
          />
          <Button icon={<ReloadOutlined />} onClick={handleReset} size="large">
            重置
          </Button>
        </Space>
      </Card>

      {payments.length === 0 ? (
        <Card
          bordered={false}
          style={{
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          }}
        >
          <Empty
            description={
              <div>
                <Text style={{ display: 'block', marginBottom: 8, fontSize: 15 }}>
                  暂无支付记录
                </Text>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  当您标记订阅为已支付时，支付记录将显示在这里
                </Text>
              </div>
            }
            style={{ padding: '60px 0' }}
          />
        </Card>
      ) : (
        <Card
          bordered={false}
          style={{
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          }}
        >
          <Table
            columns={columns}
            dataSource={payments}
            rowKey="id"
            pagination={false}
            scroll={{ x: 800 }}
          />
          {pagination.total > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: 24,
                paddingTop: 16,
                borderTop: '1px solid #f0f0f0',
              }}
            >
              <Pagination
                current={pagination.page}
                pageSize={pagination.limit}
                total={pagination.total}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 条记录`}
                onChange={handlePageChange}
                onShowSizeChange={(_, size) => handlePageChange(1, size)}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default PaymentHistory;