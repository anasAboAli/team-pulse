import axios from 'axios';

/**
 * عميل HTTP موحّد:
 * - يضيف access token لكل طلب
 * - عند انتهاء الصلاحية يجدّد الجلسة مرة واحدة (طلب refresh مشترك) ثم يعيد المحاولة
 */
export const http = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  timeout: 30000,
});

let accessToken = null;
let refreshPromise = null;
const handlers = { onSessionExpired: () => {}, onPasswordChangeRequired: () => {} };

export const setAccessToken = (token) => {
  accessToken = token;
};
export const configureHttp = (h) => Object.assign(handlers, h);

/** طلب refresh واحد مهما تعددت الطلبات المتزامنة */
export function refreshSession() {
  refreshPromise ??= axios
    .post('/api/v1/auth/refresh', null, { withCredentials: true })
    .then((res) => {
      setAccessToken(res.data.accessToken);
      return res.data;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    const code = response?.data?.error?.code;

    if (response?.status === 401 && !config._retried && !config.url.startsWith('/auth/')) {
      config._retried = true;
      try {
        await refreshSession();
        return http(config);
      } catch {
        handlers.onSessionExpired();
      }
    }
    if (response?.status === 403 && code === 'PASSWORD_CHANGE_REQUIRED') {
      handlers.onPasswordChangeRequired();
    }
    return Promise.reject(error);
  },
);

/** رسالة خطأ عربية قابلة للعرض */
export function errorMessage(error, fallback = 'حدث خطأ غير متوقع، حاول مجدداً') {
  if (error?.response?.data?.error?.message) return error.response.data.error.message;
  if (error?.code === 'ERR_NETWORK') return 'تعذّر الاتصال بالخادم، تحقق من الاتصال';
  if (error?.code === 'ECONNABORTED') return 'انتهت مهلة الطلب';
  return fallback;
}

/** أخطاء الحقول من استجابة 422 */
export const fieldErrors = (error) => error?.response?.data?.error?.details ?? {};
