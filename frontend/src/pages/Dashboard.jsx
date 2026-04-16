import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Spin,
  Alert,
  Button,
  List,
  Avatar,
  Statistic,
  Empty,
  Space,
  Divider,
} from 'antd';
import {
  DollarOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  RightOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { dashboardAPI } from '../services/api';
import {
  formatCurrency,
  formatDate,
  getDaysUntil,
  getCycleShortLabel,
} from '../utils/helpers';

const { Title, Text, Paragraph } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [monthlyExpenses, setMonthlyExpenses] = useState(null);
  const [upcomingSubscriptions, setUpcomingSubscriptions] = useState([]);
  const [paymentStats, setPaymentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expensesRes, upcomingRes, statsRes] = await Promise.all([
          dashboardAPI.getMonthlyExpenses(),
          dashboardAPI.getUpcoming(7),
          dashboardAPI.getPaymentStats(),
        ]);

        if (expensesRes.data.success) {
          setMonthlyExpenses(expensesRes.data.data);
        }
        if (upcomingRes.data.success) {
          setUpcomingSubscriptions(upcomingRes.data.data);
        }
        if (statsRes.data.success) {
          setPaymentStats(statsRes.data.data);
        }
      } catch (err) {
        setError(err.message || '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getDaysTagColor = (days) => {
    if (days === 0) return 'error';
    if (days <= 2) return 'warning';
    return 'success';
  };

  const getDaysText = (days) => {
    if (days === 0) return '今天';
    if (days === 1) return '明天';
    return `${days} 天后`;
  };

  const statCards = [
    {
      title: '本月预计支出',
      value: monthlyExpenses
        ? formatCurrency(monthlyExpenses.total)
        : '¥0.00',
      icon: <DollarOutlined />,
      color: '#1890ff',
      bgColor: '#e6f7ff',
    },
    {
      title: '活跃订阅数',
      value: monthlyExpenses ? monthlyExpenses.count : 0,
      icon: <UnorderedListOutlined />,
      color: '#52c41a',
      bgColor: '#f6ffed',
    },
    {
      title: '7 天内待续费',
      value: upcomingSubscriptions.length,
      icon: <ClockCircleOutlined />,
      color: '#fa8c16',
      bgColor: '#fff7e6',
    },
  ];

  const paymentStatCards = [
    {
      title: '本月已支付',
      count: paymentStats?.paid?.count || 0,
      total: paymentStats?.paid?.total || 0,
      icon: <CheckCircleOutlined />,
      color: '#52c41a',
      bgColor: '#f6ffed',
      label: '已支付',
    },
    {
      title: '本月待支付',
      count: paymentStats?.pending?.count || 0,
      total: paymentStats?.pending?.total || 0,
      icon: <HistoryOutlined />,
      color: '#fa8c16',
      bgColor: '#fff7e6',
      label: '待支付',
    },
  ];

  if (loading) {
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
            仪表盘
          </Title>
          <Text type="secondary">查看您的订阅支出概览</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/subscriptions')}
          size="large"
        >
          添加订阅
        </Button>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        {statCards.map((card, index) => (
          <Col xs={24} sm={8} key={index}>
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    backgroundColor: card.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <span
                    style={{
                      fontSize: 24,
                      color: card.color,
                    }}
                  >
                    {card.icon}
                  </span>
                </div>
                <div>
                  <Statistic
                    title={
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {card.title}
                      </Text>
                    }
                    value={card.value}
                    valueStyle={{
                      fontSize: 26,
                      fontWeight: 600,
                      color: '#1f1f1f',
                    }}
                  />
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          marginBottom: 24,
        }}
      >
        <Title level={5} style={{ margin: 0, marginBottom: 20 }}>
          本月支付统计
        </Title>
        <Row gutter={[24, 0]}>
          {paymentStatCards.map((card, index) => (
            <Col xs={24} sm={12} key={index}>
              <Card
                size="small"
                style={{
                  borderRadius: 8,
                  border: `1px solid ${card.color}20`,
                  backgroundColor: card.bgColor,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      backgroundColor: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 20,
                        color: card.color,
                      }}
                    >
                      {card.icon}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Row gutter={[16, 0]} align="middle">
                      <Col span={8}>
                        <Statistic
                          title={
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {card.title}
                            </Text>
                          }
                          value={card.count}
                          valueStyle={{
                            fontSize: 22,
                            fontWeight: 600,
                            color: card.color,
                          }}
                          suffix={
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              项
                            </Text>
                          }
                        />
                      </Col>
                      <Col span={16}>
                        <Divider type="vertical" style={{ height: 40 }} />
                        <div style={{ display: 'inline-block', marginLeft: 16 }}>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                            金额
                          </Text>
                          <Text
                            strong
                            style={{
                              fontSize: 18,
                              color: card.color,
                            }}
                          >
                            {formatCurrency(card.total)}
                          </Text>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card
        title={
          <Space>
            <ClockCircleOutlined style={{ color: '#fa8c16' }} />
            <span>7 天内待续费项目</span>
            <Tag color="blue" style={{ marginLeft: 8 }}>
              共 {upcomingSubscriptions.length} 项
            </Tag>
          </Space>
        }
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
      >
        {upcomingSubscriptions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Paragraph style={{ marginBottom: 8 }}>
                  未来 7 天没有待续费的订阅
                </Paragraph>
                <Button
                  type="link"
                  icon={<RightOutlined />}
                  onClick={() => navigate('/subscriptions')}
                >
                  管理所有订阅
                </Button>
              </div>
            }
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            dataSource={upcomingSubscriptions}
            renderItem={(sub) => {
              const daysUntil = getDaysUntil(sub.next_charge_date);
              return (
                <List.Item
                  style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}
                  actions={[
                    <Tag
                      color={getDaysTagColor(daysUntil)}
                      style={{ margin: 0 }}
                    >
                      {getDaysText(daysUntil)}
                    </Tag>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        size={48}
                        style={{
                          backgroundColor: '#f0f0f0',
                          borderRadius: 12,
                        }}
                        icon={<span style={{ fontSize: 20 }}>📦</span>}
                      />
                    }
                    title={
                      <Text strong style={{ fontSize: 15 }}>
                        {sub.name}
                      </Text>
                    }
                    description={
                      <Space>
                        <CalendarOutlined style={{ color: '#999' }} />
                        <Text type="secondary">
                          {formatDate(sub.next_charge_date)}
                        </Text>
                        {sub.category && (
                          <Tag color="default" style={{ marginLeft: 8 }}>
                            {sub.category}
                          </Tag>
                        )}
                      </Space>
                    }
                  />
                  <div style={{ textAlign: 'right', marginRight: 16 }}>
                    <Text strong style={{ fontSize: 18 }}>
                      {formatCurrency(sub.amount)}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {getCycleShortLabel(sub.cycle_type)}
                    </Text>
                  </div>
                </List.Item>
              );
            }}
            style={{ padding: 0 }}
          />
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
