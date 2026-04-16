import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Card,
  Typography,
  Space,
  Spin,
  Alert,
  Empty,
  Popconfirm,
  Avatar,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  CheckCircleOutlined,
  MoneyCollectOutlined,
  SearchOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { subscriptionAPI } from '../services/api';
import {
  formatCurrency,
  formatDate,
  getCycleLabel,
  getCycleShortLabel,
  getDaysUntil,
} from '../utils/helpers';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const defaultFormData = {
  name: '',
  amount: '',
  currency: 'CNY',
  cycle_type: 'monthly',
  start_date: dayjs(),
  description: '',
  category: '',
};

const cycleOptions = [
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季度' },
  { value: 'yearly', label: '每年' },
];

const currencyOptions = [
  { value: 'CNY', label: 'CNY (¥ 人民币)' },
  { value: 'USD', label: 'USD ($ 美元)' },
  { value: 'EUR', label: 'EUR (€ 欧元)' },
];

const Subscriptions = () => {
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [payingSubscription, setPayingSubscription] = useState(null);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sorter, setSorter] = useState({ field: 'next_charge_date', order: 'ascend' });
  const [originalSubscription, setOriginalSubscription] = useState(null);
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [priceHistorySubscription, setPriceHistorySubscription] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const [showPriceChangeConfirm, setShowPriceChangeConfirm] = useState(false);
  const [pendingUpdateData, setPendingUpdateData] = useState(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getAll();
      if (response.data.success) {
        setSubscriptions(response.data.data);
      }
    } catch (err) {
      setError(err.message || '获取订阅列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    form.setFieldsValue(defaultFormData);
    setShowModal(true);
  };

  const openEditModal = (record) => {
    setEditingId(record.id);
    setOriginalSubscription({
      amount: record.amount,
      currency: record.currency || 'CNY',
    });
    form.setFieldsValue({
      name: record.name,
      amount: record.amount,
      currency: record.currency || 'CNY',
      cycle_type: record.cycle_type,
      start_date: dayjs(record.start_date),
      description: record.description || '',
      category: record.category || '',
      price_change_note: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);

    try {
      const submitData = {
        ...values,
        start_date: values.start_date.format('YYYY-MM-DD'),
      };

      if (editingId && values.price_change_note) {
        submitData.price_change_note = values.price_change_note;
      }

      if (editingId) {
        const response = await subscriptionAPI.update(editingId, submitData);
        if (response.data.priceChanged) {
          const oldAmount = response.data.oldAmount;
          const newAmount = response.data.newAmount;
          const isIncrease = newAmount > oldAmount;
          message.success(
            `价格已${isIncrease ? '上涨' : '下调'}: ${formatCurrency(oldAmount, values.currency)} → ${formatCurrency(newAmount, values.currency)}`
          );
        }
      } else {
        await subscriptionAPI.create(submitData);
      }

      setShowModal(false);
      form.resetFields();
      fetchSubscriptions();
    } catch (err) {
      Modal.error({
        title: '保存失败',
        content: err.response?.data?.error || '请稍后重试',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await subscriptionAPI.delete(id);
      fetchSubscriptions();
    } catch (err) {
      Modal.error({
        title: '删除失败',
        content: err.response?.data?.error || '请稍后重试',
      });
    }
  };

  const openPayModal = (record) => {
    setPayingSubscription(record);
    payForm.setFieldsValue({
      payment_date: dayjs(),
      amount: record.amount,
    });
    setShowPayModal(true);
  };

  const handlePay = async (values) => {
    setPaying(true);

    try {
      const submitData = {
        payment_date: values.payment_date.format('YYYY-MM-DD'),
        amount: values.amount,
      };

      const response = await subscriptionAPI.pay(payingSubscription.id, submitData);
      
      if (response.data.success) {
        message.success('标记已支付成功！下次扣费日期已自动顺延。');
        setShowPayModal(false);
        payForm.resetFields();
        fetchSubscriptions();
      }
    } catch (err) {
      Modal.error({
        title: '标记支付失败',
        content: err.response?.data?.error || '请稍后重试',
      });
    } finally {
      setPaying(false);
    }
  };

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

  const getCycleTagColor = (cycleType) => {
    const colors = {
      weekly: 'blue',
      monthly: 'processing',
      quarterly: 'purple',
      yearly: 'cyan',
    };
    return colors[cycleType] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: '活跃',
      paused: '已暂停',
      cancelled: '已取消',
    };
    return labels[status] || '活跃';
  };

  const getStatusTagColor = (status) => {
    const colors = {
      active: 'success',
      paused: 'warning',
      cancelled: 'default',
    };
    return colors[status] || 'success';
  };

  const openPriceHistoryModal = async (record) => {
    setPriceHistorySubscription(record);
    setShowPriceHistoryModal(true);
    setPriceHistoryLoading(true);
    
    try {
      const response = await subscriptionAPI.getPriceHistory(record.id);
      if (response.data.success) {
        setPriceHistory(response.data.data);
      }
    } catch (err) {
      message.error('获取价格历史失败');
    } finally {
      setPriceHistoryLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await subscriptionAPI.updateStatus(id, newStatus);
      if (response.data.success) {
        message.success(`订阅已${newStatus === 'active' ? '恢复' : newStatus === 'paused' ? '暂停' : '取消'}`);
        fetchSubscriptions();
      }
    } catch (err) {
      Modal.error({
        title: '操作失败',
        content: err.response?.data?.error || '请稍后重试',
      });
    }
  };

  const getFilteredAndSortedSubscriptions = () => {
    let filtered = subscriptions;
    if (searchText) {
      filtered = subscriptions.filter(sub => 
        sub.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (sub.category && sub.category.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    if (sorter.field && sorter.order) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sorter.field];
        let bVal = b[sorter.field];
        
        if (sorter.field === 'next_charge_date' || sorter.field === 'start_date') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        if (sorter.order === 'ascend') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    return filtered;
  };

  const handleTableChange = (pagination, filters, sorter) => {
    if (sorter.field) {
      setSorter({
        field: sorter.field,
        order: sorter.order || 'ascend'
      });
    }
  };

  const columns = [
    {
      title: '订阅名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 200,
      sorter: true,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            size={40}
            style={{
              backgroundColor: '#f0f0f0',
              borderRadius: 10,
              marginRight: 12,
            }}
            icon={<span style={{ fontSize: 18 }}>📦</span>}
          />
          <div>
            <Text strong style={{ fontSize: 14, display: 'block' }}>
              {text}
            </Text>
            {record.category && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.category}
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 160,
      sorter: true,
      render: (amount, record) => {
        const latestChange = record.latest_price_change;
        const hasRecentIncrease = latestChange && latestChange.new_amount > latestChange.old_amount;
        
        return (
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
              <Text strong style={{ fontSize: 15 }}>
                {formatCurrency(amount, record.currency)}
              </Text>
              {hasRecentIncrease && (
                <Tag color="red" style={{ margin: 0 }}>
                  <RiseOutlined style={{ fontSize: 10 }} /> 涨价
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {getCycleShortLabel(record.cycle_type)}
            </Text>
            {hasRecentIncrease && (
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                {formatCurrency(latestChange.old_amount, latestChange.currency)} → {formatCurrency(latestChange.new_amount, latestChange.currency)}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: '周期',
      dataIndex: 'cycle_type',
      key: 'cycle_type',
      align: 'center',
      width: 120,
      sorter: true,
      render: (cycleType) => (
        <Tag color={getCycleTagColor(cycleType)}>
          {getCycleLabel(cycleType)}
        </Tag>
      ),
    },
    {
      title: '开始日期',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 140,
      sorter: true,
      render: (date) => (
        <Text type="secondary">{formatDate(date)}</Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      sorter: true,
      render: (status) => (
        <Tag color={getStatusTagColor(status)}>
          {getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: '下次扣费',
      dataIndex: 'next_charge_date',
      key: 'next_charge_date',
      width: 180,
      sorter: true,
      defaultSortOrder: 'ascend',
      render: (date, record) => {
        const daysUntil = getDaysUntil(date);
        return (
          <div>
            <Text>{formatDate(date)}</Text>
            <div style={{ marginTop: 4 }}>
              <Tag color={getDaysTagColor(daysUntil)}>
                {getDaysText(daysUntil)}
              </Tag>
            </div>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 520,
      align: 'center',
      render: (_, record) => {
        const isActive = record.status === 'active';
        const isPaused = record.status === 'paused';
        const isCancelled = record.status === 'cancelled';

        return (
          <Space size="small">
            {isActive && (
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => openPayModal(record)}
                style={{ color: '#52c41a' }}
              >
                标记已支付
              </Button>
            )}
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => openPriceHistoryModal(record)}
              style={{ color: '#1890ff' }}
            >
              价格历史
            </Button>
            {isActive && (
              <Popconfirm
                title="确认暂停"
                description="确定要暂停这个订阅吗？暂停后将不会出现在待续费和待支付列表中。"
                okText="确认暂停"
                cancelText="取消"
                onConfirm={() => handleStatusChange(record.id, 'paused')}
              >
                <Button
                  type="link"
                  size="small"
                  icon={<PauseCircleOutlined />}
                  style={{ color: '#faad14' }}
                >
                  暂停
                </Button>
              </Popconfirm>
            )}
            {isPaused && (
              <Popconfirm
                title="确认恢复"
                description="确定要恢复这个订阅吗？恢复后将重新出现在待续费和待支付列表中。"
                okText="确认恢复"
                cancelText="取消"
                onConfirm={() => handleStatusChange(record.id, 'active')}
              >
                <Button
                  type="link"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  style={{ color: '#52c41a' }}
                >
                  恢复
                </Button>
              </Popconfirm>
            )}
            {!isCancelled && (
              <Popconfirm
                title="确认取消"
                description="确定要取消这个订阅吗？取消后将不会出现在待续费和待支付列表中，但仍可恢复。"
                okText="确认取消"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleStatusChange(record.id, 'cancelled')}
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                >
                  取消
                </Button>
              </Popconfirm>
            )}
            {isCancelled && (
              <Popconfirm
                title="确认恢复"
                description="确定要恢复这个已取消的订阅吗？恢复后将重新出现在待续费和待支付列表中。"
                okText="确认恢复"
                cancelText="取消"
                onConfirm={() => handleStatusChange(record.id, 'active')}
              >
                <Button
                  type="link"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  style={{ color: '#52c41a' }}
                >
                  恢复
                </Button>
              </Popconfirm>
            )}
            <Popconfirm
              title="确认删除"
              description="确定要删除这个订阅吗？此操作无法撤销。"
              okText="确认删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.id)}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
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

  const filteredSubscriptions = getFilteredAndSortedSubscriptions();

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
            订阅管理
          </Title>
          <Text type="secondary">管理您的所有订阅和固定支出</Text>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Input
            placeholder="搜索订阅名称或分类"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            size="large"
          >
            添加订阅
          </Button>
        </div>
      </div>

      {subscriptions.length === 0 ? (
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
                <Paragraph style={{ marginBottom: 8, fontSize: 15 }}>
                  还没有订阅
                </Paragraph>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  开始添加您的订阅服务，以便更好地管理和追踪您的定期支出
                </Text>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreateModal}
                >
                  添加第一个订阅
                </Button>
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
            dataSource={filteredSubscriptions}
            rowKey="id"
            onChange={handleTableChange}
            pagination={{
              showTotal: (total) => `共 ${total} 条记录`,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            scroll={{ x: 1400 }}
          />
        </Card>
      )}

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: editingId ? '#fff7e6' : '#e6f7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <UnorderedListOutlined
                style={{ color: editingId ? '#fa8c16' : '#1890ff', fontSize: 18 }}
              />
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>
                {editingId ? '编辑订阅' : '添加订阅'}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {editingId ? '修改订阅信息' : '添加新的订阅服务'}
              </Text>
            </div>
          </div>
        }
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={560}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={defaultFormData}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label="订阅名称"
            rules={[{ required: true, message: '请输入订阅名称' }]}
          >
            <Input
              placeholder="例如：Netflix、Spotify、电费"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label="金额"
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              min={0}
              step={0.01}
              size="large"
              prefix="¥"
            />
          </Form.Item>

          <Form.Item
            name="currency"
            label="货币"
          >
            <Select options={currencyOptions} size="large" />
          </Form.Item>

          <Form.Item
            name="cycle_type"
            label="扣费周期"
            rules={[{ required: true, message: '请选择扣费周期' }]}
          >
            <Select options={cycleOptions} size="large" />
          </Form.Item>

          <Form.Item
            name="start_date"
            label="开始日期"
            rules={[{ required: true, message: '请选择开始日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              size="large"
              placeholder="选择开始日期"
              suffixIcon={<CalendarOutlined />}
            />
          </Form.Item>

          <Form.Item name="category" label="分类">
            <Input
              placeholder="例如：娱乐、工具、音乐、生活缴费"
              size="large"
            />
          </Form.Item>

          <Form.Item name="description" label="备注">
            <TextArea
              rows={2}
              placeholder="可选的备注信息"
              size="large"
              showCount
              maxLength={200}
            />
          </Form.Item>

          {editingId && (
            <Form.Item
              name="price_change_note"
              label={
                <span>
                  价格变更备注
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                    (修改金额时填写)
                  </Text>
                </span>
              }
            >
              <TextArea
                rows={2}
                placeholder="例如：服务价格调整、套餐升级等"
                size="large"
                showCount
                maxLength={200}
              />
            </Form.Item>
          )}

          <Form.Item
            style={{
              marginBottom: 0,
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid #f0f0f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button size="large" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                size="large"
              >
                {editingId ? '保存修改' : '添加订阅'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#f6ffed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <MoneyCollectOutlined
                style={{ color: '#52c41a', fontSize: 18 }}
              />
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>
                标记已支付
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                确认支付后将自动顺延下次扣费日期
              </Text>
            </div>
          </div>
        }
        open={showPayModal}
        onCancel={() => setShowPayModal(false)}
        footer={null}
        width={480}
        centered
      >
        {payingSubscription && (
          <div style={{ marginTop: 24 }}>
            <Card
              size="small"
              style={{ marginBottom: 24, backgroundColor: '#fafafa' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    size={40}
                    style={{
                      backgroundColor: '#f0f0f0',
                      borderRadius: 10,
                      marginRight: 12,
                    }}
                    icon={<span style={{ fontSize: 18 }}>📦</span>}
                  />
                  <div>
                    <Text strong style={{ fontSize: 15, display: 'block' }}>
                      {payingSubscription.name}
                    </Text>
                    <Tag color={getCycleTagColor(payingSubscription.cycle_type)}>
                      {getCycleLabel(payingSubscription.cycle_type)}
                    </Tag>
                  </div>
                </div>
                <Text strong style={{ fontSize: 20, color: '#1890ff' }}>
                  {formatCurrency(payingSubscription.amount, payingSubscription.currency)}
                </Text>
              </div>
            </Card>

            <Form
              form={payForm}
              layout="vertical"
              onFinish={handlePay}
            >
              <Form.Item
                name="payment_date"
                label="支付日期"
                rules={[{ required: true, message: '请选择支付日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="选择支付日期"
                  suffixIcon={<CalendarOutlined />}
                />
              </Form.Item>

              <Form.Item
                name="amount"
                label="实际支付金额"
                rules={[{ required: true, message: '请输入支付金额' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  size="large"
                  prefix="¥"
                />
              </Form.Item>

              <Alert
                message="支付后系统将自动根据订阅周期顺延下次扣费日期"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Form.Item style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <Button size="large" onClick={() => setShowPayModal(false)}>
                    取消
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={paying}
                    size="large"
                    icon={<CheckCircleOutlined />}
                  >
                    确认已支付
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#e6f7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <HistoryOutlined
                style={{ color: '#1890ff', fontSize: 18 }}
              />
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>
                价格变更历史
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {priceHistorySubscription?.name || ''}
              </Text>
            </div>
          </div>
        }
        open={showPriceHistoryModal}
        onCancel={() => setShowPriceHistoryModal(false)}
        footer={null}
        width={640}
        centered
      >
        {priceHistoryLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spin tip="加载中..." />
          </div>
        ) : priceHistory.length === 0 ? (
          <Empty
            description="暂无价格变更记录"
            style={{ padding: '40px 0' }}
          />
        ) : (
          <div style={{ marginTop: 24 }}>
            <List
              dataSource={priceHistory}
              renderItem={(item, index) => {
                const isIncrease = item.new_amount > item.old_amount;
                const changeAmount = item.new_amount - item.old_amount;
                const changePercent = item.old_amount > 0 ? ((changeAmount / item.old_amount) * 100).toFixed(1) : 0;
                
                return (
                  <List.Item
                    style={{
                      padding: '16px 0',
                      borderBottom: index < priceHistory.length - 1 ? '1px solid #f0f0f0' : 'none',
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size={48}
                          style={{
                            backgroundColor: isIncrease ? '#fff2f0' : '#f6ffed',
                            borderRadius: 12,
                          }}
                          icon={
                            <span style={{ fontSize: 20, color: isIncrease ? '#ff4d4f' : '#52c41a' }}>
                              {isIncrease ? <RiseOutlined /> : <span>↓</span>}
                            </span>
                          }
                        />
                      }
                      title={
                        <Space>
                          <Text strong style={{ fontSize: 15 }}>
                            {formatCurrency(item.old_amount, item.currency)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 14 }}>→</Text>
                          <Text 
                            strong 
                            style={{ 
                              fontSize: 15, 
                              color: isIncrease ? '#ff4d4f' : '#52c41a' 
                            }}
                          >
                            {formatCurrency(item.new_amount, item.currency)}
                          </Text>
                          <Tag color={isIncrease ? 'red' : 'green'}>
                            {isIncrease ? '+' : ''}{formatCurrency(changeAmount, item.currency)}
                            ({isIncrease ? '+' : ''}{changePercent}%)
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4} style={{ display: 'flex' }}>
                          <Space>
                            <CalendarOutlined style={{ color: '#999' }} />
                            <Text type="secondary">
                              生效日期: {formatDate(item.effective_date)}
                            </Text>
                          </Space>
                          {item.note && (
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              备注: {item.note}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Subscriptions;
