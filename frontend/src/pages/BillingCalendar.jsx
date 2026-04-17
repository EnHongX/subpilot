import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Typography,
  Spin,
  Alert,
  Badge,
  Tag,
  Modal,
  List,
  Avatar,
  Space,
  Button,
  Select,
  Row,
  Col,
  Empty,
  Calendar,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { subscriptionAPI } from '../services/api';
import {
  formatCurrency,
  formatDate,
  getDaysUntil,
  getCycleLabel,
} from '../utils/helpers';

const { Title, Text } = Typography;

const BillingCalendar = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await subscriptionAPI.getAll();
        if (response.data.success) {
          setSubscriptions(response.data.data);
        }
      } catch (err) {
        setError(err.message || '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredSubscriptions = useMemo(() => {
    if (filterStatus === 'all') return subscriptions;
    return subscriptions.filter(sub => sub.status === filterStatus);
  }, [subscriptions, filterStatus]);

  const getSubscriptionsByDate = useMemo(() => {
    const map = new Map();
    filteredSubscriptions.forEach(sub => {
      if (sub.status !== 'active') return;
      const dateStr = sub.next_charge_date;
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr).push(sub);
    });
    return map;
  }, [filteredSubscriptions]);

  const upcomingSubscriptions = useMemo(() => {
    const today = dayjs().startOf('day');
    const upcoming = filteredSubscriptions
      .filter(sub => sub.status === 'active')
      .filter(sub => {
        const chargeDate = dayjs(sub.next_charge_date).startOf('day');
        const daysDiff = chargeDate.diff(today, 'day');
        return daysDiff >= 0 && daysDiff <= 7;
      })
      .sort((a, b) => new Date(a.next_charge_date) - new Date(b.next_charge_date));
    return upcoming;
  }, [filteredSubscriptions]);

  const getDaysTagColor = (days) => {
    if (days < 0) return 'default';
    if (days === 0) return 'error';
    if (days <= 3) return 'warning';
    if (days <= 7) return 'orange';
    return 'success';
  };

  const getDaysText = (days) => {
    if (days < 0) return '已过期';
    if (days === 0) return '今天';
    if (days === 1) return '明天';
    return `${days} 天后`;
  };

  const getStatusColor = (status) => {
    if (status === 'active') return 'success';
    if (status === 'paused') return 'warning';
    return 'default';
  };

  const getStatusText = (status) => {
    if (status === 'active') return '活跃';
    if (status === 'paused') return '已暂停';
    return '已取消';
  };

  const dateCellRender = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const subs = getSubscriptionsByDate.get(dateStr) || [];
    
    if (subs.length === 0) return null;

    const today = dayjs().startOf('day');
    const cellDate = dayjs(dateStr).startOf('day');
    const daysDiff = cellDate.diff(today, 'day');
    
    let badgeStatus = 'default';
    if (daysDiff === 0) badgeStatus = 'error';
    else if (daysDiff > 0 && daysDiff <= 3) badgeStatus = 'warning';
    else if (daysDiff > 0 && daysDiff <= 7) badgeStatus = 'processing';

    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {subs.slice(0, 2).map((sub) => (
          <li key={sub.id} style={{ marginBottom: 2 }}>
            <Badge
              status={badgeStatus}
              text={
                <Text
                  style={{
                    fontSize: 11,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {sub.name}
                </Text>
              }
            />
          </li>
        ))}
        {subs.length > 2 && (
          <li>
            <Text type="secondary" style={{ fontSize: 11 }}>
              +{subs.length - 2} 项
            </Text>
          </li>
        )}
      </ul>
    );
  };

  const onSelect = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const subs = getSubscriptionsByDate.get(dateStr) || [];
    if (subs.length > 0) {
      setModalDate(dateStr);
      setModalVisible(true);
    }
  };

  const onPanelChange = (value) => {
    setSelectedMonth(value);
  };

  const monthlySubscriptions = useMemo(() => {
    const monthStart = selectedMonth.startOf('month');
    const monthEnd = selectedMonth.endOf('month');
    
    return filteredSubscriptions
      .filter(sub => sub.status === 'active')
      .filter(sub => {
        const chargeDate = dayjs(sub.next_charge_date);
        return chargeDate.isAfter(monthStart.subtract(1, 'day')) && 
               chargeDate.isBefore(monthEnd.add(1, 'day'));
      })
      .sort((a, b) => new Date(a.next_charge_date) - new Date(b.next_charge_date));
  }, [filteredSubscriptions, selectedMonth]);

  const monthlyTotalByCurrency = useMemo(() => {
    const totals = {};
    monthlySubscriptions.forEach(sub => {
      const currency = sub.currency || 'CNY';
      if (!totals[currency]) {
        totals[currency] = { total: 0, count: 0 };
      }
      totals[currency].total += sub.amount;
      totals[currency].count += 1;
    });
    return totals;
  }, [monthlySubscriptions]);

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
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
            账单日历
          </Title>
          <Text type="secondary">查看订阅的扣费日期安排</Text>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: '全部订阅' },
              { value: 'active', label: '仅活跃' },
              { value: 'paused', label: '仅暂停' },
              { value: 'cancelled', label: '已取消' },
            ]}
          />
        </div>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
            title={
              <Space>
                <CalendarOutlined style={{ color: '#1890ff' }} />
                <span>{selectedMonth.format('YYYY年MM月')}</span>
              </Space>
            }
            extra={
              <Space>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => setSelectedMonth(selectedMonth.subtract(1, 'month'))}
                />
                <Button
                  onClick={() => setSelectedMonth(dayjs())}
                >
                  今天
                </Button>
                <Button
                  icon={<ArrowRightOutlined />}
                  onClick={() => setSelectedMonth(selectedMonth.add(1, 'month'))}
                />
              </Space>
            }
          >
            <Calendar
              value={selectedMonth}
              onPanelChange={onPanelChange}
              onSelect={onSelect}
              cellRender={dateCellRender}
              fullscreen={false}
              headerRender={() => null}
            />
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                点击有订阅的日期查看详情
              </Text>
              <Space size="small" style={{ flexWrap: 'wrap' }}>
                <Space size="small">
                  <Badge status="error" />
                  <Text type="secondary" style={{ fontSize: 12 }}>今天</Text>
                </Space>
                <Space size="small">
                  <Badge status="warning" />
                  <Text type="secondary" style={{ fontSize: 12 }}>3天内</Text>
                </Space>
                <Space size="small">
                  <Badge status="processing" />
                  <Text type="secondary" style={{ fontSize: 12 }}>7天内</Text>
                </Space>
                <Space size="small">
                  <Badge status="default" />
                  <Text type="secondary" style={{ fontSize: 12 }}>其他</Text>
                </Space>
              </Space>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              marginBottom: 24,
            }}
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#fa8c16' }} />
                <span>即将扣费</span>
                <Tag color="orange" style={{ marginLeft: 0 }}>
                  {upcomingSubscriptions.length} 项
                </Tag>
              </Space>
            }
          >
            {upcomingSubscriptions.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="未来7天没有待扣费的订阅"
                style={{ padding: '20px 0' }}
              />
            ) : (
              <List
                dataSource={upcomingSubscriptions}
                size="small"
                renderItem={(sub) => {
                  const daysUntil = getDaysUntil(sub.next_charge_date);
                  return (
                    <List.Item
                      style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
                      actions={[
                        <Tag color={getDaysTagColor(daysUntil)} style={{ margin: 0 }}>
                          {getDaysText(daysUntil)}
                        </Tag>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            size={36}
                            style={{
                              backgroundColor: '#f0f0f0',
                              borderRadius: 8,
                            }}
                            icon={<span style={{ fontSize: 16 }}>📦</span>}
                          />
                        }
                        title={
                          <Text strong style={{ fontSize: 13 }}>
                            {sub.name}
                          </Text>
                        }
                        description={
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {formatCurrency(sub.amount, sub.currency)} {getCycleLabel(sub.cycle_type)}
                          </Text>
                        }
                      />
                    </List.Item>
                  );
                }}
                style={{ maxHeight: 400, overflow: 'auto' }}
              />
            )}
          </Card>

          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
            title={
              <Space>
                <DollarOutlined style={{ color: '#52c41a' }} />
                <span>本月预计支出</span>
              </Space>
            }
          >
            {Object.keys(monthlyTotalByCurrency).length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="本月没有预计支出"
                style={{ padding: '20px 0' }}
              />
            ) : (
              <List
                dataSource={Object.entries(monthlyTotalByCurrency)}
                size="small"
                renderItem={([currency, { total, count }]) => (
                  <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size={36}
                          style={{
                            backgroundColor: '#f6ffed',
                            borderRadius: 8,
                          }}
                          icon={<DollarOutlined style={{ color: '#52c41a' }} />}
                        />
                      }
                      title={
                        <Text strong style={{ fontSize: 16 }}>
                          {formatCurrency(total, currency)}
                        </Text>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {currency === 'CNY' ? '人民币' : currency === 'USD' ? '美元' : '欧元'} · {count} 项
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
        title={
          <Space>
            <CalendarOutlined style={{ color: '#1890ff' }} />
            <span>本月扣费明细</span>
            <Tag color="blue" style={{ marginLeft: 0 }}>
              {monthlySubscriptions.length} 项
            </Tag>
          </Space>
        }
      >
        {monthlySubscriptions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="本月没有预计扣费的订阅"
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            dataSource={monthlySubscriptions}
            renderItem={(sub) => {
              const daysUntil = getDaysUntil(sub.next_charge_date);
              return (
                <List.Item
                  style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}
                  actions={[
                    <Tag color={getDaysTagColor(daysUntil)} style={{ margin: 0 }}>
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
                      <Space>
                        <Text strong style={{ fontSize: 15 }}>
                          {sub.name}
                        </Text>
                        {sub.status !== 'active' && (
                          <Tag color={getStatusColor(sub.status)}>
                            {getStatusText(sub.status)}
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Space size="large" style={{ flexWrap: 'wrap' }}>
                        <Space>
                          <CalendarOutlined style={{ color: '#999' }} />
                          <Text type="secondary">
                            {formatDate(sub.next_charge_date)}
                          </Text>
                        </Space>
                        {sub.category && (
                          <Tag color="default">{sub.category}</Tag>
                        )}
                        <Tag color={sub.cycle_type === 'weekly' ? 'blue' : sub.cycle_type === 'monthly' ? 'processing' : sub.cycle_type === 'quarterly' ? 'purple' : 'cyan'}>
                          {getCycleLabel(sub.cycle_type)}
                        </Tag>
                      </Space>
                    }
                  />
                  <div style={{ textAlign: 'right', marginRight: 16 }}>
                    <Text strong style={{ fontSize: 18 }}>
                      {formatCurrency(sub.amount, sub.currency)}
                    </Text>
                  </div>
                </List.Item>
              );
            }}
            style={{ padding: 0 }}
          />
        )}
      </Card>

      <Modal
        title={
          <Space>
            <CalendarOutlined style={{ color: '#1890ff' }} />
            <span>{modalDate && dayjs(modalDate).format('YYYY年MM月DD日')} - 扣费明细</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={640}
      >
        {modalDate && getSubscriptionsByDate.get(modalDate) && (
          <List
            dataSource={getSubscriptionsByDate.get(modalDate)}
            renderItem={(sub) => {
              const daysUntil = getDaysUntil(sub.next_charge_date);
              return (
                <List.Item
                  style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}
                  actions={[
                    <Tag color={getDaysTagColor(daysUntil)} style={{ margin: 0 }}>
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
                      <Space>
                        <Text strong style={{ fontSize: 15 }}>
                          {sub.name}
                        </Text>
                        {sub.status !== 'active' && (
                          <Tag color={getStatusColor(sub.status)}>
                            {getStatusText(sub.status)}
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <Space size="large" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
                          <Space>
                            <CalendarOutlined style={{ color: '#999' }} />
                            <Text type="secondary">
                              开始日期: {formatDate(sub.start_date)}
                            </Text>
                          </Space>
                          {sub.category && (
                            <Tag color="default">{sub.category}</Tag>
                          )}
                          <Tag color={sub.cycle_type === 'weekly' ? 'blue' : sub.cycle_type === 'monthly' ? 'processing' : sub.cycle_type === 'quarterly' ? 'purple' : 'cyan'}>
                            {getCycleLabel(sub.cycle_type)}
                          </Tag>
                        </Space>
                        {sub.description && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            备注: {sub.description}
                          </Text>
                        )}
                      </div>
                    }
                  />
                  <div style={{ textAlign: 'right', marginRight: 16 }}>
                    <Text strong style={{ fontSize: 20, color: '#1890ff' }}>
                      {formatCurrency(sub.amount, sub.currency)}
                    </Text>
                  </div>
                </List.Item>
              );
            }}
            style={{ padding: 0 }}
          />
        )}
      </Modal>
    </div>
  );
};

export default BillingCalendar;
