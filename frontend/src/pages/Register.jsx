import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    setError('');

    try {
      const result = await register(values.username, values.password);
      if (result.success) {
        message.success('注册成功，已自动登录');
        navigate('/');
      } else {
        setError(result.error || '注册失败');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '注册失败，请稍后重试';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span style={{ fontSize: 28 }}>💳</span>
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
            创建账号
          </Title>
          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
            注册成功后将自动登录
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError('')}
          />
        )}

        <Form
          name="register"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 8, message: '用户名长度必须为2-8位' },
              { pattern: /^\S+$/, message: '用户名不能包含空格' },
            ]}
            help="用户名长度为2-8位，不能包含空格"
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="用户名 (2-8位)"
              maxLength={8}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 2, max: 8, message: '密码长度必须为2-8位' },
            ]}
            help="密码长度为2-8位"
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码 (2-8位)"
              maxLength={8}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="确认密码"
              maxLength={8}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%', height: 44, fontSize: 16 }}
            >
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              已有账号？{' '}
              <Link to="/login" style={{ fontWeight: 500 }}>
                立即登录
              </Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;
