<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Activity,
  Bell,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  SlidersHorizontal,
  Star,
  Sun,
  User,
  UserCog,
  Users,
} from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import NotificationsMenu from '@/components/common/NotificationsMenu.vue';
import { RoleBadge } from '@/components/common/Badges';
import { useAuthStore } from '@/stores/auth';
import { useCompanyStore } from '@/stores/company';
import { useNotificationsStore } from '@/stores/notifications';
import { useThemeStore } from '@/stores/theme';
import { useUiStore } from '@/stores/ui';

const auth = useAuthStore();
const theme = useThemeStore();
const ui = useUiStore();
const company = useCompanyStore();
const notifications = useNotificationsStore();
const route = useRoute();
const router = useRouter();

const userMenu = ref(false);
const notifMenu = ref(false);

/** عناصر القائمة الجانبية حسب الدور */
const nav = computed(() => {
  const role = auth.role;
  if (role === 'admin') {
    return [
      { title: 'الرئيسية', items: [{ to: '/admin/dashboard', label: 'لوحة الشركة', icon: LayoutDashboard }] },
      {
        title: 'الهيكل التنظيمي',
        items: [
          { to: '/departments', label: 'الأقسام', icon: Building2 },
          { to: { path: '/users', query: { role: 'manager' } }, match: 'manager', label: 'المدراء', icon: UserCog },
          { to: { path: '/users', query: { role: 'employee' } }, match: 'employee', label: 'الموظفون', icon: Users },
        ],
      },
      {
        title: 'العمل',
        items: [
          { to: '/tasks', label: 'المهام', icon: ClipboardList },
          { to: '/evaluations', label: 'التقييمات', icon: Star },
          { to: '/activity', label: 'سجل النشاط', icon: Activity },
        ],
      },
      {
        title: 'الإعدادات',
        items: [
          { to: '/admin/company', label: 'بيانات الشركة', icon: Settings },
          { to: '/admin/criteria', label: 'معايير التقييم', icon: SlidersHorizontal },
        ],
      },
    ];
  }
  if (role === 'manager') {
    return [
      { title: 'الرئيسية', items: [{ to: '/manager/dashboard', label: 'لوحة القسم', icon: LayoutDashboard }] },
      {
        title: 'قسمي',
        items: [
          ...(auth.user?.department ? [{ to: `/departments/${auth.user.department.id}`, label: auth.user.department.name, icon: Building2 }] : []),
          { to: '/users', label: 'موظفو القسم', icon: Users },
          { to: '/tasks', label: 'مهام القسم', icon: ClipboardList },
          { to: '/evaluations', label: 'التقييمات', icon: Star },
          { to: '/activity', label: 'نشاط القسم', icon: Activity },
        ],
      },
    ];
  }
  return [
    {
      title: 'مساحتي',
      items: [
        { to: '/my/dashboard', label: 'لوحتي', icon: LayoutDashboard },
        { to: '/tasks', label: 'مهامي', icon: ClipboardList },
        { to: '/evaluations', label: 'تقييماتي', icon: Star },
      ],
    },
  ];
});

/** تمييز رابط المدراء/الموظفين حسب query */
function isActive(item) {
  const path = typeof item.to === 'string' ? item.to : item.to.path;
  if (item.match) return route.path === path && route.query.role === item.match;
  if (path === '/users' && auth.isAdmin) return false;
  return route.path === path || route.path.startsWith(`${path}/`);
}

async function logout() {
  userMenu.value = false;
  notifications.stopPolling();
  await auth.logout();
  router.push('/login');
}

function closeMenus(e) {
  if (!e.target.closest('.menu-wrap')) {
    userMenu.value = false;
    notifMenu.value = false;
  }
}

watch(() => route.fullPath, () => (ui.sidebarOpen = false));

onMounted(() => {
  company.load();
  notifications.startPolling();
  document.addEventListener('click', closeMenus);
});
onBeforeUnmount(() => {
  notifications.stopPolling();
  document.removeEventListener('click', closeMenus);
});
</script>

<template>
  <div class="shell">
    <!-- القائمة الجانبية -->
    <aside class="sidebar" :class="{ open: ui.sidebarOpen }">
      <RouterLink :to="auth.homeRoute" class="brand">
        <img v-if="company.logo_url" :src="company.logo_url" alt="" class="logo" />
        <span v-else class="logo-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32"><path d="M5 17h5l3-7 5 13 3-6h6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </span>
        <span class="brand-text">
          <strong>TeamPulse</strong>
          <small class="truncate">{{ company.name }}</small>
        </span>
      </RouterLink>

      <nav aria-label="القائمة الرئيسية">
        <div v-for="group in nav" :key="group.title" class="nav-group">
          <span class="nav-title">{{ group.title }}</span>
          <RouterLink
            v-for="item in group.items"
            :key="item.label"
            :to="item.to"
            class="nav-item"
            :class="{ active: isActive(item) }"
          >
            <component :is="item.icon" />
            <span class="truncate">{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>

      <div class="sidebar-foot">
        <RouterLink to="/profile" class="nav-item" :class="{ active: route.path === '/profile' }">
          <User />
          <span>ملفي الشخصي</span>
        </RouterLink>
      </div>
    </aside>
    <div v-if="ui.sidebarOpen" class="scrim" @click="ui.sidebarOpen = false" />

    <!-- المحتوى -->
    <div class="main">
      <header class="topbar">
        <button class="btn btn-ghost btn-icon menu-btn" aria-label="فتح القائمة" @click="ui.sidebarOpen = true"><Menu /></button>
        <div class="crumb truncate">
          <span class="muted small">{{ auth.user?.department?.name || company.name }}</span>
        </div>
        <div class="spacer" />

        <button
          class="btn btn-ghost btn-icon"
          :aria-label="theme.isDark ? 'الوضع الفاتح' : 'الوضع الداكن'"
          :title="theme.isDark ? 'الوضع الفاتح' : 'الوضع الداكن'"
          @click="theme.toggle()"
        >
          <Sun v-if="theme.isDark" />
          <Moon v-else />
        </button>

        <div class="menu-wrap">
          <button
            class="btn btn-ghost btn-icon bell"
            aria-label="الإشعارات"
            @click="(notifMenu = !notifMenu), (userMenu = false), notifMenu && notifications.fetchRecent()"
          >
            <Bell />
            <span v-if="notifications.unread" class="count num">{{ notifications.unread > 99 ? '99+' : notifications.unread }}</span>
          </button>
          <NotificationsMenu v-if="notifMenu" @close="notifMenu = false" />
        </div>

        <div class="menu-wrap">
          <button class="user-btn" @click="(userMenu = !userMenu), (notifMenu = false)">
            <UserAvatar :name="auth.user?.full_name" :src="auth.user?.avatar_url" :size="34" />
            <span class="user-text">
              <strong class="truncate">{{ auth.user?.full_name }}</strong>
              <small class="muted">{{ auth.user?.job_title || '' }}</small>
            </span>
          </button>
          <div v-if="userMenu" class="dropdown">
            <div class="dropdown-head">
              <strong>{{ auth.user?.full_name }}</strong>
              <span class="muted small">{{ auth.user?.email }}</span>
              <RoleBadge :role="auth.role" style="width: fit-content; margin-top: 4px" />
            </div>
            <RouterLink to="/profile" class="dropdown-item" @click="userMenu = false"><User /> ملفي الشخصي</RouterLink>
            <button class="dropdown-item" @click="theme.toggle()">
              <component :is="theme.isDark ? Sun : Moon" /> {{ theme.isDark ? 'الوضع الفاتح' : 'الوضع الداكن' }}
            </button>
            <button class="dropdown-item danger" @click="logout"><LogOut /> تسجيل الخروج</button>
          </div>
        </div>
      </header>

      <main class="content">
        <RouterView v-slot="{ Component }">
          <component :is="Component" :key="route.path" />
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; display: flex; }

/* القائمة الجانبية */
.sidebar {
  position: fixed;
  inset-block: 0;
  inset-inline-start: 0;
  width: var(--sidebar-w);
  background: var(--surface);
  border-inline-end: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 50;
  transition: transform 0.2s ease;
}
.brand { display: flex; align-items: center; gap: 10px; padding: 16px 18px; height: var(--topbar-h); color: var(--text); text-decoration: none !important; border-block-end: 1px solid var(--border); }
.logo, .logo-mark { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; object-fit: cover; }
.logo-mark { display: grid; place-items: center; background: var(--primary); color: #fff; }
.logo-mark svg { width: 24px; height: 24px; }
.brand-text { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
.brand-text small { color: var(--text-muted); font-size: 0.75rem; }

nav { flex: 1; overflow-y: auto; padding: 12px; }
.nav-group { display: flex; flex-direction: column; gap: 2px; margin-block-end: 16px; }
.nav-title { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); padding: 4px 12px; letter-spacing: 0.02em; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: var(--radius);
  color: var(--text-2); font-weight: 500; font-size: 0.92rem;
  text-decoration: none !important; min-width: 0;
}
.nav-item svg { width: 19px; height: 19px; flex-shrink: 0; }
.nav-item:hover { background: var(--surface-3); color: var(--text); }
.nav-item.active { background: var(--primary-soft); color: var(--primary-text); font-weight: 600; }
.sidebar-foot { padding: 12px; border-block-start: 1px solid var(--border); }

/* المحتوى */
.main { flex: 1; min-width: 0; margin-inline-start: var(--sidebar-w); display: flex; flex-direction: column; }
.topbar {
  position: sticky; top: 0; z-index: 40;
  height: var(--topbar-h);
  display: flex; align-items: center; gap: 8px;
  padding: 0 24px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  backdrop-filter: blur(8px);
  border-block-end: 1px solid var(--border);
}
.crumb { min-width: 0; }
.menu-btn { display: none; }
.content { padding: 28px 24px 48px; width: 100%; max-width: 1400px; margin-inline: auto; }

.menu-wrap { position: relative; }
.bell { position: relative; }
.count {
  position: absolute; top: 2px; inset-inline-end: 0;
  min-width: 18px; height: 18px; padding: 0 4px;
  border-radius: 999px; background: var(--danger); color: #fff;
  font-size: 0.7rem; font-weight: 700; display: grid; place-items: center;
  border: 2px solid var(--surface);
}
.user-btn {
  display: flex; align-items: center; gap: 10px;
  border: 0; background: none; padding: 4px 8px; border-radius: var(--radius); cursor: pointer; text-align: start;
}
.user-btn:hover { background: var(--surface-3); }
.user-text { display: flex; flex-direction: column; line-height: 1.3; max-width: 160px; }
.user-text strong { font-size: 0.88rem; }
.user-text small { font-size: 0.75rem; }

.dropdown {
  position: absolute; top: calc(100% + 8px); inset-inline-end: 0;
  width: 250px; z-index: 60;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
  padding: 6px;
}
.dropdown-head { display: flex; flex-direction: column; padding: 10px 12px; border-block-end: 1px solid var(--border); margin-block-end: 6px; }
.dropdown-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 9px 12px; border: 0; background: none; border-radius: var(--radius-sm);
  color: var(--text); font-size: 0.9rem; cursor: pointer; text-decoration: none !important;
}
.dropdown-item svg { width: 17px; height: 17px; color: var(--text-muted); }
.dropdown-item:hover { background: var(--surface-3); }
.dropdown-item.danger, .dropdown-item.danger svg { color: var(--danger); }

.scrim { display: none; }

@media (max-width: 960px) {
  .sidebar { transform: translateX(100%); box-shadow: var(--shadow-lg); }
  .sidebar.open { transform: none; }
  .scrim { display: block; position: fixed; inset: 0; background: var(--overlay); z-index: 45; }
  .main { margin-inline-start: 0; }
  .menu-btn { display: inline-flex; }
  .topbar { padding: 0 12px; }
  .content { padding: 20px 16px 40px; }
  .user-text { display: none; }
}
</style>
