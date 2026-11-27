# تجهيز ورفع Moaaz Social إلى GitHub بأمان

## قبل الرفع

1. استخدم مستودع GitHub من نوع **Private** في البداية.
2. لا ترفع أي ملف `.env` حقيقي، أو كلمات مرور، أو مفاتيح API، أو ملفات شهادات خاصة.
3. احتفظ بملفات `.env.example` فقط؛ فهي قوالب بأسماء المتغيرات دون أسرار.
4. إذا سبق أن رُفعت مفاتيح حقيقية إلى أي مستودع، فاعتبرها مكشوفة ودوّرها/ألغها فوراً. حذف الملف في commit لاحق لا يزيله من تاريخ Git.
5. راجع قائمة الملفات قبل أول commit.

## طريقة الرفع من واجهة GitHub

1. سجّل الدخول إلى GitHub واستخدم المستودع الخاص المعتمد `mrbdalmnmtjany-spec/my-product` على الفرع `main`، أو أنشئ مستودعاً خاصاً جديداً إذا قررت تغيير الوجهة.
2. اختر **Private**، ولا تضف README أو `.gitignore` أو License من GitHub لأن المشروع يحتوي هذه الملفات بالفعل.
3. فك ضغط أرشيف المشروع محلياً.
4. افتح مجلد `moaaz-chat` وتأكد أن `.gitignore` موجود في الجذر.
5. ارفع محتويات المجلد إلى المستودع، وليس المجلد الخارجي الذي يحتويه.
6. قبل الضغط على Commit، تأكد من عدم وجود `.env` أو `node_modules` أو `dist` أو أي ملف مفاتيح.
7. نفّذ أول commit برسالة مثل `Prepare Moaaz Social for Render deployment`.

## طريقة Git (اختيارية)

من Terminal داخل مجلد المشروع:

```bash
git init
git branch -M main
git add .
git status --short
```

راجع ناتج `git status --short` وتأكد أنه لا يعرض ملفات أسرار. ثم:

```bash
git commit -m "Prepare Moaaz Social for Render deployment"
git remote add origin https://github.com/mrbdalmnmtjany-spec/my-product.git
git push -u origin main
```

تأكد أن المستودع فارغ أو أن لديك خطة واضحة لدمج أي ملفات موجودة قبل الدفع. لا تضع كلمة مرور GitHub أو Personal Access Token داخل الأوامر أو ملفات المشروع؛ استخدم نافذة المصادقة الرسمية أو GitHub CLI.

## بعد الرفع

- افتح المستودع وتأكد أن ملفات `.env.example` فقط ظاهرة.
- لا تضع `OPENAI_API_KEY` في متغير يبدأ بـ `VITE_`؛ يجب أن يبقى في Backend Environment على Render.
- أضف الأسرار الفعلية من Render Dashboard > Environment بعد ربط المستودع.
- لا تشارك لقطات شاشة تعرض قيم المتغيرات السرية.

## ملاحظة مهمة

رفع الكود إلى GitHub لا يعني أن التطبيق أصبح منشوراً أو أن البناء نجح. يجب مراجعة Render Build Logs وتشغيل اختبارات الخدمة بعد ربط المستودع.
