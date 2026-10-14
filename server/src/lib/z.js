import { z } from 'zod';

// رسائل التحقق الافتراضية بالعربية
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case 'invalid_type':
      if (issue.received === 'undefined' || issue.received === 'null') return { message: 'هذا الحقل مطلوب' };
      return { message: 'قيمة غير صالحة' };
    case 'too_small':
      if (issue.type === 'string') {
        return { message: issue.minimum === 1 ? 'هذا الحقل مطلوب' : `يجب ألا يقل عن ${issue.minimum} أحرف` };
      }
      if (issue.type === 'array') return { message: `يجب اختيار ${issue.minimum} عنصر على الأقل` };
      return { message: `يجب ألا تقل القيمة عن ${issue.minimum}` };
    case 'too_big':
      if (issue.type === 'string') return { message: `يجب ألا يزيد عن ${issue.maximum} حرفاً` };
      if (issue.type === 'array') return { message: `الحد الأقصى ${issue.maximum} عناصر` };
      return { message: `يجب ألا تزيد القيمة عن ${issue.maximum}` };
    case 'invalid_string':
      if (issue.validation === 'email') return { message: 'البريد الإلكتروني غير صالح' };
      if (issue.validation === 'url') return { message: 'الرابط غير صالح' };
      return { message: 'صيغة غير صالحة' };
    case 'invalid_enum_value':
      return { message: 'قيمة غير مسموحة' };
    case 'invalid_date':
      return { message: 'تاريخ غير صالح' };
    default:
      return { message: ctx.defaultError };
  }
});

export { z };

export const id = z.coerce.number().int().positive();
export const idParam = z.object({ id });

export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح');

/** نص اختياري: الفراغ يتحول إلى null، وغياب الحقل يبقى undefined (لا يُحدَّث) */
export const optText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v === undefined ? undefined : v || null));

export const optDate = dateString.nullish().or(z.literal('')).transform((v) => (v === undefined ? undefined : v || null));

export const boolish = z.union([z.boolean(), z.enum(['true', 'false', '1', '0'])]).transform((v) => v === true || v === 'true' || v === '1');

export const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(15),
};

export const password = z
  .string()
  .min(8, 'كلمة المرور يجب ألا تقل عن 8 أحرف')
  .max(72)
  .regex(/[A-Za-z]/, 'كلمة المرور يجب أن تحتوي على حرف إنجليزي واحد على الأقل')
  .regex(/\d/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
