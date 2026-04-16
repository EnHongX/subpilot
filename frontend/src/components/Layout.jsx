import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography, theme } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  UserOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Text } = Typography;

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表盘',
      onClick: () => navigate('/'),
    },
    {
      key: '/subscriptions',
      icon: <UnorderedListOutlined />,
      label: '订阅管理',
      onClick: () => navigate('/subscriptions'),
    },
  ];

  const formatDateDisplay = () => {
    const now = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekDay = weekDays[now.getDay()];
    return `${month}月${day}日 ${weekDay}`;
  };

  const userMenuItems = [
    {
      key: '1',
      label: '个人设置',
    },
    {
      key: '2',
      label: '退出登录',
      danger: true,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginRight: 48,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <span style={{ fontSize: 18 }}>💳</span>
            </div>
            <Typography.Title
              level={5}
              style={{ margin: 0, fontWeight: 600, color: '#1f1f1f' }}
            >
              订阅管理台
            </Typography.Title>
          </div>

          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{
              borderBottom: 'none',
              minWidth: 200,
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', color: '#666' }}>
            <CalendarOutlined style={{ marginRight: 6 }} />
            <Text type="secondary" style={{ fontSize: 13 }}>
              {formatDateDisplay()}
            </Text>
          </div>

          <div style={{ width: 1, height: 24, background: '#e8e8e8' }} />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                transition: 'background 0.2s',
              }}
            >
              <Avatar
                size={32}
                style={{
                  background: 'linear-gradient(135deg, #52c41a 0%, #13c2c2 100%)',
                }}
                icon={<UserOutlined />}
              />
              <Text style={{ marginLeft: 8, fontSize: 13 }}>用户</Text>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Content
        style={{
          padding: '24px 32px',
          background: '#f5f5f5',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Content>
    </Layout>
  );
};

export default AppLayout;
