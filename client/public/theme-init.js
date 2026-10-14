// تطبيق الثيم قبل رسم الصفحة لتجنّب الوميض (ملف منفصل ليتوافق مع سياسة CSP)
(function () {
  try {
    var mode = localStorage.getItem('tp-theme') || 'system';
    var dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
