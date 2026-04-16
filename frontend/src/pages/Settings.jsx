import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Divider, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const { Title, Text } = Typography;

const Settings = () => {
  const [form] = Form.useForm();
  const { user, updateUserInfo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateNickname = async (values) => {
    setLoading(true);
    try {
      const response = await authAPI.updateProfile({ nickname: values.nickname });
      if (response.data.success) {
        updateUserInfo(response.data.data);
        message.success('昵称更新成功');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '更新失败，请稍后重试';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (values) => {
    setPasswordLoading(true);
    try {
      const response = await authAPI.updateProfile({ password: values.newPassword });
      if (response.data.success) {
        message.success('密码更新成功');
        form.resetFields(['oldPassword', 'newPassword', 'confirmPassword']);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '更新失败，请稍后重试';
      message.error(errorMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        个人设置
      </Title>

      <Card
        style={{ marginBottom: 24 }}
        title={
          <Space>
            <UserOutlined />
            <span>基本信息</span>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ nickname: user?.nickname || user?.username }}
          onFinish={handleUpdateNickname}
        >
          <Form.Item label="用户名">
            <Input value={user?.username} disabled prefix={<UserOutlined />} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              用户名不可修改
            </Text>
          </Form.Item>

          <Form.Item
            name="nickname"
            label="昵称"
            rules={[
              { required: true, message: '请输入昵称' },
              { min: 2, max: 8, message: '昵称长度必须为2-8位' },
            ]}
            help="昵称长度为2-8位"
          >
            <Input
              placeholder="请输入昵称"
              maxLength={8}
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存昵称
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <Space>
            <LockOutlined />
            <span>修改密码</span>
          </Space>
        }
      >
        <Form
          layout="vertical"
          onFinish={handleUpdatePassword}
        >
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 2, max: 8, message: '密码长度必须为2-8位' },
            ]}
            help="密码长度为2-8位"
          >
            <Input.Password
              placeholder="请输入新密码"
              maxLength={8}
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="请再次输入新密码"
              maxLength={8}
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={passwordLoading}>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Settings;
