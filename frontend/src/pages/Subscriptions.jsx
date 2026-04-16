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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
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
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

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
    form.setFieldsValue({
      name: record.name,
      amount: record.amount,
      currency: record.currency || 'CNY',
      cycle_type: record.cycle_type,
      start_date: dayjs(record.start_date),
      description: record.description || '',
      category: record.category || '',
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

      if (editingId) {
        await subscriptionAPI.update(editingId, submitData);
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

  const columns = [
    {
      title: '订阅名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
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
      width: 140,
      render: (amount, record) => (
        <div style={{ textAlign: 'right' }}>
          <Text strong style={{ fontSize: 15 }}>
            {formatCurrency(amount, record.currency)}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {getCycleShortLabel(record.cycle_type)}
          </Text>
        </div>
      ),
    },
    {
      title: '周期',
      dataIndex: 'cycle_type',
      key: 'cycle_type',
      align: 'center',
      width: 120,
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
      render: (date) => (
        <Text type="secondary">{formatDate(date)}</Text>
      ),
    },
    {
      title: '下次扣费',
      dataIndex: 'next_charge_date',
      key: 'next_charge_date',
      width: 180,
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
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
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
      ),
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
            订阅管理
          </Title>
          <Text type="secondary">管理您的所有订阅和固定支出</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
          size="large"
        >
          添加订阅
        </Button>
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
            dataSource={subscriptions}
            rowKey="id"
            pagination={{
              showTotal: (total) => `共 ${total} 条记录`,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            scroll={{ x: 900 }}
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
    </div>
  );
};

export default Subscriptions;
