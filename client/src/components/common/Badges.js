import { h } from 'vue';
import { Star } from 'lucide-vue-next';
import { ICONS } from '@/utils/icons';
import { ROLES, TASK_PRIORITIES, TASK_STATUSES, scoreLevel } from '@/utils/constants';
import { formatScore } from '@/utils/format';

/** شارات صغيرة: لا يُعتمد على اللون وحده — كل شارة تحمل نصاً (وأيقونة للحالة) */

export const StatusBadge = (props) => {
  const s = TASK_STATUSES[props.status] ?? { label: props.status, badge: '' };
  return h('span', { class: ['badge', s.badge] }, [ICONS[s.icon] ? h(ICONS[s.icon]) : null, s.label]);
};
StatusBadge.props = ['status'];

export const PriorityBadge = (props) => {
  const p = TASK_PRIORITIES[props.priority] ?? { label: props.priority, badge: '' };
  return h('span', { class: ['badge', p.badge] }, [h('span', { class: 'dot' }), p.label]);
};
PriorityBadge.props = ['priority'];

export const RoleBadge = (props) => {
  const r = ROLES[props.role] ?? { label: props.role, badge: '' };
  return h('span', { class: ['badge', r.badge] }, r.label);
};
RoleBadge.props = ['role'];

export const ScoreBadge = (props) => {
  const level = scoreLevel(props.score);
  if (!level) return h('span', { class: 'muted' }, 'لا يوجد');
  return h('span', { class: ['badge', level.badge] }, [h(Star), h('span', { class: 'num' }, formatScore(props.score)), ` · ${level.label}`]);
};
ScoreBadge.props = ['score'];

export const ActiveBadge = (props) =>
  h('span', { class: ['badge', props.active ? 'badge-success' : 'badge-danger'] }, [h('span', { class: 'dot' }), props.active ? 'نشط' : 'معطّل']);
ActiveBadge.props = ['active'];
