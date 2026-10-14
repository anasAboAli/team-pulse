<script setup>
import { onMounted, ref } from 'vue';
import { Camera, KeyRound, Monitor, Moon, Save, Sun, Trash2 } from 'lucide-vue-next';
import { profileApi } from '@/api';
import { errorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { RoleBadge, ScoreBadge } from '@/components/common/Badges';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useUiStore } from '@/stores/ui';
import { formatDate } from '@/utils/format';

const auth = useAuthStore();
const theme = useThemeStore();
const ui = useUiStore();

const profile = ref(null);
const phone = ref('');
const fullName = ref('');
const saving = ref(false);
const fileInput = ref(null);

function apply(data) {
  profile.value = { ...profile.value, ...data };
  phone.value = data.phone || '';
  fullName.value = data.full_name;
  auth.setUser({ ...auth.user, ...data });
}

onMounted(async () => apply((await profileApi.get()).data));

async function save() {
  saving.value = true;
  try {
    apply((await profileApi.update({ phone: phone.value, full_name: auth.isAdmin ? fullName.value : undefined })).data);
    ui.success('تم حفظ بياناتك');
  } catch (e) {
    ui.error(errorMessage(e));
  } finally {
    saving.value = false;
  }
}

async function uploadAvatar(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    apply((await profileApi.uploadAvatar(file)).data);
    ui.success('تم تحديث الصورة');
  } catch (err) {
    ui.error(errorMessage(err));
  }
}

async function removeAvatar() {
  apply((await profileApi.removeAvatar()).data);
}

const THEMES = [
  { value: 'light', label: 'فاتح', icon: Sun },
  { value: 'dark', label: 'داكن', icon: Moon },
  { value: 'system', label: 'حسب النظام', icon: Monitor },
];
</script>

<template>
  <div>
    <PageHeader title="ملفي الشخصي" subtitle="بياناتك الأساسية يديرها المشرف أو مدير قسمك، ويمكنك تعديل بياناتك الشخصية هنا" />

    <LoadingState v-if="!profile" variant="dashboard" />
    <div v-else class="grid-3">
      <section class="card head">
        <div class="avatar-wrap">
          <UserAvatar :name="profile.full_name" :src="profile.avatar_url" :size="96" />
          <button class="btn btn-icon btn-sm cam" aria-label="تغيير الصورة" @click="fileInput.click()"><Camera /></button>
          <input ref="fileInput" type="file" accept=".png,.jpg,.jpeg,.webp" hidden @change="uploadAvatar" />
        </div>
        <h2>{{ profile.full_name }}</h2>
        <span class="muted">{{ profile.job_title || '—' }}</span>
        <RoleBadge :role="profile.role" />
        <button v-if="profile.avatar_url" class="btn btn-ghost btn-sm" @click="removeAvatar"><Trash2 /> إزالة الصورة</button>
        <hr class="divider" style="width: 100%" />
        <dl class="dl small" style="width: 100%">
          <dt>البريد</dt>
          <dd dir="ltr" style="text-align: end">{{ profile.email }}</dd>
          <dt>القسم</dt>
          <dd>{{ profile.department?.name || '—' }}</dd>
          <template v-if="profile.manager">
            <dt>المدير</dt>
            <dd>{{ profile.manager.full_name }}</dd>
          </template>
          <dt>التعيين</dt>
          <dd>{{ formatDate(profile.hire_date) }}</dd>
          <template v-if="profile.role !== 'admin'">
            <dt>متوسط تقييمي</dt>
            <dd><ScoreBadge :score="profile.stats?.average_score" /></dd>
          </template>
        </dl>
      </section>

      <div class="stack span-2" style="gap: 20px">
        <section class="card">
          <div class="card-header"><h2>البيانات الشخصية</h2></div>
          <form class="form-grid" @submit.prevent="save">
            <div class="field">
              <label for="p-name">الاسم</label>
              <input id="p-name" v-model="fullName" class="input" :disabled="!auth.isAdmin" />
              <span v-if="!auth.isAdmin" class="hint">يتم تعديل الاسم من قِبل الإدارة</span>
            </div>
            <div class="field">
              <label for="p-phone">رقم الهاتف</label>
              <input id="p-phone" v-model="phone" class="input" dir="ltr" />
            </div>
            <div class="full row" style="justify-content: flex-end">
              <button type="submit" class="btn btn-primary" :disabled="saving"><Save /> حفظ</button>
            </div>
          </form>
        </section>

        <section class="card">
          <div class="card-header"><h2>المظهر</h2></div>
          <div class="themes" role="radiogroup" aria-label="الثيم">
            <button
              v-for="t in THEMES"
              :key="t.value"
              class="theme-opt"
              role="radio"
              :aria-checked="theme.mode === t.value"
              :class="{ active: theme.mode === t.value }"
              @click="theme.setMode(t.value)"
            >
              <component :is="t.icon" />
              {{ t.label }}
            </button>
          </div>
        </section>

        <section class="card row-between">
          <div>
            <h2>كلمة المرور</h2>
            <p class="muted small">ننصح بتغيير كلمة المرور بشكل دوري.</p>
          </div>
          <RouterLink to="/change-password" class="btn"><KeyRound /> تغيير كلمة المرور</RouterLink>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
.avatar-wrap { position: relative; margin-bottom: 4px; }
.cam { position: absolute; bottom: 0; inset-inline-end: 0; border-radius: 50%; background: var(--surface); }
.themes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.theme-opt {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 16px; border: 2px solid var(--border); border-radius: var(--radius-lg);
  background: var(--surface-2); cursor: pointer; font-weight: 600;
}
.theme-opt svg { width: 22px; height: 22px; }
.theme-opt.active { border-color: var(--primary); background: var(--primary-soft); color: var(--primary-text); }
</style>
