<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, Download, FileText, MessageSquare, Pencil, Send, Trash2 } from 'lucide-vue-next';
import { attachmentsApi, saveBlob, tasksApi } from '@/api';
import { errorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import FileUploader from '@/components/common/FileUploader.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import UserCell from '@/components/common/UserCell.vue';
import { PriorityBadge, StatusBadge } from '@/components/common/Badges';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { TRANSITION_ACTIONS } from '@/utils/constants';
import { ICONS } from '@/utils/icons';
import { formatDate, formatDateTime, formatDue, formatFileSize, formatRelative } from '@/utils/format';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();

const task = ref(null);
const comments = ref([]);
const error = ref('');
const busy = ref(false);
const uploadProgress = ref(null);
const newComment = ref('');
const sending = ref(false);

const isAssignee = computed(() => task.value?.assignee_id === auth.user.id);
const myFiles = computed(() => task.value?.attachments.filter((a) => a.uploaded_by === task.value.assignee_id) ?? []);
const needsFile = computed(() => task.value?.requires_attachment && !myFiles.value.length && isAssignee.value);

async function load() {
  try {
    const [t, c] = await Promise.all([tasksApi.get(route.params.id), tasksApi.comments(route.params.id)]);
    task.value = t.data;
    comments.value = c.data;
  } catch (e) {
    error.value = e.response?.status === 404 ? 'المهمة غير موجودة أو ليس لديك صلاحية الوصول إليها' : errorMessage(e);
  }
}

async function transition(status) {
  const action = TRANSITION_ACTIONS[status];
  let comment;
  if (status === 'returned') {
    comment = await ui.confirm({
      title: 'إرجاع المهمة للتعديل',
      message: 'سيتم إشعار الموظف بسبب الإرجاع.',
      confirmText: 'إرجاع',
      input: { label: 'سبب الإرجاع والملاحظات', required: true, placeholder: 'ما الذي يحتاج إلى تعديل؟' },
    });
    if (comment === false) return;
  } else if (status === 'cancelled') {
    if (!(await ui.confirm({ title: 'إلغاء المهمة', message: 'لن يتمكن الموظف من العمل عليها بعد الإلغاء.', confirmText: 'إلغاء المهمة', cancelText: 'تراجع', danger: true }))) return;
  } else if (status === 'submitted') {
    if (!(await ui.confirm({ title: 'تسليم المهمة', message: 'سيتم إرسال المهمة للمراجعة ولن تتمكن من تعديل المرفقات حتى تتم مراجعتها.', confirmText: 'تسليم' }))) return;
  } else if (status === 'completed') {
    const note = await ui.confirm({ title: 'اعتماد المهمة كمكتملة', confirmText: 'اعتماد', input: { label: 'ملاحظة للموظف (اختياري)' } });
    if (note === false) return;
    comment = note;
  }

  busy.value = true;
  try {
    task.value = (await tasksApi.setStatus(task.value.id, status, comment || undefined)).data;
    comments.value = (await tasksApi.comments(task.value.id)).data;
    ui.success(`تم: ${action.label}`);
  } catch (e) {
    ui.error(errorMessage(e));
  } finally {
    busy.value = false;
  }
}

async function upload(files) {
  uploadProgress.value = 0;
  try {
    task.value = (await tasksApi.upload(task.value.id, files, (p) => (uploadProgress.value = p))).data;
    ui.success(files.length > 1 ? `تم رفع ${files.length} ملفات` : 'تم رفع الملف');
  } catch (e) {
    ui.error(errorMessage(e));
  } finally {
    uploadProgress.value = null;
  }
}

async function downloadFile(file) {
  try {
    saveBlob(await attachmentsApi.download(file.id), file.original_name);
  } catch {
    ui.error('تعذّر تنزيل الملف');
  }
}

async function removeFile(file) {
  if (!(await ui.confirm({ title: 'حذف الملف', message: `هل تريد حذف "${file.original_name}"؟`, confirmText: 'حذف', danger: true }))) return;
  try {
    await attachmentsApi.remove(file.id);
    task.value.attachments = task.value.attachments.filter((a) => a.id !== file.id);
    ui.success('تم حذف الملف');
  } catch (e) {
    ui.error(errorMessage(e));
  }
}

async function sendComment() {
  if (!newComment.value.trim()) return;
  sending.value = true;
  try {
    await tasksApi.addComment(task.value.id, newComment.value.trim());
    newComment.value = '';
    comments.value = (await tasksApi.comments(task.value.id)).data;
  } catch (e) {
    ui.error(errorMessage(e));
  } finally {
    sending.value = false;
  }
}

async function removeTask() {
  if (!(await ui.confirm({ title: 'حذف المهمة', message: 'سيتم حذف المهمة نهائياً من القوائم.', confirmText: 'حذف', danger: true }))) return;
  try {
    await tasksApi.remove(task.value.id);
    ui.success('تم حذف المهمة');
    router.replace('/tasks');
  } catch (e) {
    ui.error(errorMessage(e));
  }
}

onMounted(load);
</script>

<template>
  <div>
    <LoadingState v-if="!task && !error" variant="dashboard" />
    <div v-else-if="error" class="card">
      <EmptyState :icon="AlertTriangle" title="تعذّر عرض المهمة" :message="error">
        <RouterLink to="/tasks" class="btn">العودة للمهام</RouterLink>
      </EmptyState>
    </div>

    <template v-else>
      <PageHeader :title="task.title" back="/tasks">
        <RouterLink v-if="task.permissions.can_edit" :to="`/tasks/${task.id}/edit`" class="btn"><Pencil /> تعديل</RouterLink>
        <button v-if="task.permissions.can_delete" class="btn btn-ghost" style="color: var(--danger)" @click="removeTask"><Trash2 /> حذف</button>
      </PageHeader>

      <div class="layout">
        <div class="stack" style="gap: 20px; min-width: 0">
          <!-- شريط الإجراءات -->
          <section v-if="task.permissions.transitions.length" class="card action-bar">
            <div class="stack-sm" style="gap: 2px">
              <strong>الإجراء التالي</strong>
              <span v-if="needsFile" class="small" style="color: var(--warning)">هذه المهمة تتطلب إرفاق ملف قبل التسليم.</span>
              <span v-else-if="task.status === 'submitted' && !isAssignee" class="muted small">سلّم الموظف المهمة، راجعها ثم اعتمدها أو أعدها للتعديل.</span>
              <span v-else class="muted small">حدّث حالة المهمة لإعلام الطرف الآخر.</span>
            </div>
            <div class="row" style="gap: 8px">
              <button
                v-for="s in task.permissions.transitions"
                :key="s"
                class="btn"
                :class="TRANSITION_ACTIONS[s].className"
                :disabled="busy || (s === 'submitted' && needsFile)"
                @click="transition(s)"
              >
                <component :is="ICONS[TRANSITION_ACTIONS[s].icon]" />
                {{ TRANSITION_ACTIONS[s].label }}
              </button>
            </div>
          </section>

          <section class="card">
            <div class="card-header"><h2>الوصف</h2></div>
            <p v-if="task.description" class="desc">{{ task.description }}</p>
            <p v-else class="muted">لا يوجد وصف.</p>
          </section>

          <!-- المرفقات -->
          <section class="card">
            <div class="card-header">
              <div>
                <h2>المرفقات <span class="muted num">({{ task.attachments.length }})</span></h2>
                <p v-if="task.requires_attachment" class="card-sub">هذه المهمة تتطلب رفع ملف من الموظف عند التسليم</p>
              </div>
            </div>
            <ul v-if="task.attachments.length" class="list files">
              <li v-for="f in task.attachments" :key="f.id">
                <span class="file-icon"><FileText /></span>
                <div class="file-meta">
                  <button class="link truncate" @click="downloadFile(f)">{{ f.original_name }}</button>
                  <span class="muted small">{{ formatFileSize(f.size_bytes) }} · {{ f.uploaded_by_name }} · {{ formatRelative(f.created_at) }}</span>
                </div>
                <button class="btn btn-ghost btn-icon btn-sm" aria-label="تنزيل" @click="downloadFile(f)"><Download /></button>
                <button
                  v-if="task.permissions.can_upload && (f.uploaded_by === auth.user.id || auth.isAdmin)"
                  class="btn btn-ghost btn-icon btn-sm"
                  aria-label="حذف"
                  style="color: var(--danger)"
                  @click="removeFile(f)"
                >
                  <Trash2 />
                </button>
              </li>
            </ul>
            <p v-else-if="!task.permissions.can_upload" class="muted">لا توجد مرفقات.</p>
            <FileUploader v-if="task.permissions.can_upload" :progress="uploadProgress" :disabled="uploadProgress != null" style="margin-top: 12px" @select="upload" @error="ui.error" />
          </section>

          <!-- التعليقات -->
          <section class="card">
            <div class="card-header"><h2>التعليقات والسجل</h2></div>
            <ul v-if="comments.length" class="list thread">
              <li v-for="c in comments" :key="c.id" :class="{ system: c.is_system }">
                <UserAvatar :name="c.user.full_name" :src="c.user.avatar_url" :size="32" />
                <div class="bubble">
                  <div class="row" style="gap: 8px">
                    <strong class="small">{{ c.user.full_name }}</strong>
                    <span class="muted small" :title="formatDateTime(c.created_at)">{{ formatRelative(c.created_at) }}</span>
                  </div>
                  <p>{{ c.body }}</p>
                </div>
              </li>
            </ul>
            <EmptyState v-else :icon="MessageSquare" title="لا توجد تعليقات بعد" />
            <form class="composer" @submit.prevent="sendComment">
              <textarea v-model="newComment" class="textarea" rows="2" maxlength="2000" placeholder="اكتب تعليقاً أو استفساراً…" aria-label="تعليق جديد" @keydown.ctrl.enter="sendComment" />
              <button type="submit" class="btn btn-primary" :disabled="sending || !newComment.trim()"><Send /> إرسال</button>
            </form>
          </section>
        </div>

        <!-- التفاصيل -->
        <aside class="card side">
          <div class="row" style="gap: 8px; margin-bottom: 16px">
            <StatusBadge :status="task.status" />
            <PriorityBadge :priority="task.priority" />
            <span v-if="task.is_overdue" class="badge badge-danger">متأخرة</span>
          </div>
          <dl class="dl">
            <dt>الموظف</dt>
            <dd><UserCell :name="task.assignee.full_name" :avatar="task.assignee.avatar_url" :size="28" :to="auth.canManage ? `/users/${task.assignee.id}` : null" /></dd>
            <dt>أسندها</dt>
            <dd>{{ task.assigner.full_name }}</dd>
            <dt>القسم</dt>
            <dd>{{ task.department?.name || '—' }}</dd>
            <dt>الموعد</dt>
            <dd>
              {{ formatDate(task.due_date) }}
              <div v-if="task.due_date && !['completed', 'cancelled'].includes(task.status)" class="small" :class="task.is_overdue ? 'danger' : 'muted'">{{ formatDue(task.due_date) }}</div>
            </dd>
            <dt>أُنشئت</dt>
            <dd class="small">{{ formatDateTime(task.created_at) }}</dd>
            <template v-if="task.submitted_at">
              <dt>سُلّمت</dt>
              <dd class="small">{{ formatDateTime(task.submitted_at) }}</dd>
            </template>
            <template v-if="task.completed_at">
              <dt>اكتملت</dt>
              <dd class="small">{{ formatDateTime(task.completed_at) }}</dd>
            </template>
          </dl>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }
.side { position: sticky; top: calc(var(--topbar-h) + 20px); }
@media (max-width: 1000px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
  .side { position: static; order: -1; }
}
.action-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; border-color: var(--primary); background: var(--primary-soft); }
.desc { white-space: pre-wrap; color: var(--text-2); }
.files > li { display: flex; align-items: center; gap: 12px; }
.file-icon { width: 38px; height: 38px; border-radius: 10px; background: var(--primary-soft); color: var(--primary-text); display: grid; place-items: center; flex-shrink: 0; }
.file-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.link { border: 0; background: none; padding: 0; text-align: start; color: var(--primary-text); font-weight: 600; cursor: pointer; }
.link:hover { text-decoration: underline; }
.thread > li { display: flex; gap: 10px; border: 0; padding: 8px 0; }
.bubble { flex: 1; min-width: 0; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 12px; }
.bubble p { white-space: pre-wrap; font-size: 0.92rem; }
.system .bubble { background: transparent; border-style: dashed; }
.system .bubble p { color: var(--text-muted); font-size: 0.85rem; }
.composer { display: flex; gap: 8px; align-items: flex-end; margin-top: 12px; }
.composer .textarea { min-height: 44px; }
.danger { color: var(--danger); font-weight: 600; }
</style>
