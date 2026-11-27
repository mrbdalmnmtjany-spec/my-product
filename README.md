# Moaaz Social

منصة تواصل اجتماعي عربية مبنية باستخدام MERN، تجمع بين التغذية الاجتماعية والمنشورات والتعليقات والإعجابات والمتابعة، والمحادثات الفورية والقصص، ومساعد Moaaz AI.

## المزايا الحالية

- حسابات المستخدمين وتسجيل الدخول والتحقق من البريد وGoogle OAuth عند الإعداد.
- ملفات شخصية ونبذة وصورة شخصية.
- متابعة المستخدمين وإلغاء المتابعة والبحث عن الأشخاص.
- تغذية اجتماعية تعرض منشورات المستخدم والحسابات التي يتابعها.
- إنشاء منشورات نصية أو بصور وفيديو، مع الإعجاب والتعليقات والحذف من صاحب المنشور.
- محادثات فردية وجماعية ورسائل نصية وصوتية ووسائط، مع Socket.IO.
- قصص تنتهي بعد 24 ساعة.
- Moaaz AI: صياغة المنشورات والردود وتلخيص النصوص وفهم الصور، مع خيار اختياري لمشاركة آخر الرسائل النصية من المحادثة الحالية.
- واجهة عربية RTL متجاوبة.

## التقنيات

- Frontend: React 18, Vite, Tailwind CSS, Socket.IO Client.
- Backend: Node.js, Express, MongoDB/Mongoose, Socket.IO.
- Media storage: Cloudflare R2 عبر واجهة S3-compatible وتوقيع AWS SigV4 باستخدام Node.js المدمج، دون SDK إضافي.
- AI: OpenAI Chat Completions API من الخادم فقط.

## التشغيل المحلي

يتطلب Node.js 20 أو أحدث وMongoDB.

```bash
cp backend/.env.example backend/.env
npm ci --prefix backend
npm ci --prefix frontend
npm run dev --prefix backend
npm run dev --prefix frontend
```

افتح عنوان Vite الذي يظهر في الطرفية. عيّن `CLIENT_URL=http://localhost:5173` في `backend/.env`.

## إعداد تخزين الوسائط عبر Cloudflare R2

لم يعد المشروع يعتمد على Cloudinary. إعداد R2 مطلوب لرفع صور الحسابات والمنشورات والقصص والوسائط داخل الدردشة.

1. أنشئ حساب Cloudflare وفعّل R2 وأنشئ Bucket خاصاً بالمشروع.
2. أنشئ مفاتيح R2 API بصلاحية قراءة/كتابة على الـBucket المطلوب فقط.
3. فعّل الوصول العام للملفات بالطريقة التي تناسبك، والأفضل ربط Custom Domain بالـBucket. لا تستخدم رابط لوحة التحكم.
4. أضف المتغيرات التالية إلى `backend/.env` أو Render Environment:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=https://media.example.com
```

`R2_PUBLIC_URL` هو نطاق توزيع الملفات العام، مثل نطاقك المخصص أو عنوان `r2.dev` الذي توفره Cloudflare عند تفعيله. لا تضع مفاتيح R2 في متغيرات تبدأ بـ `VITE_` ولا في الواجهة الأمامية.

## إعداد Moaaz AI

أضف إلى بيئة الخادم:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

لا تضع مفتاح OpenAI في ملفات الواجهة أو GitHub. الصور المرسلة للمساعد تُضغط في المتصفح وتُرسل مباشرة إلى API؛ مشاركة سياق المحادثة النصي اختيارية ويجب تفعيلها من واجهة المساعد.

## متغيرات البيئة الأساسية

راجع `backend/.env.example` و`.env.example`. أهم المتغيرات:

- `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `GOOGLE_CLIENT_ID`, `EMAIL_*` عند استخدام هذه الميزات.

## الاختبارات والبناء

```bash
npm test --prefix backend
npm run build --prefix frontend
```

## النشر على Render

يوجد `render.yaml` لتجهيز خدمة الويب. أضف متغيرات MongoDB وR2 وOpenAI والبريد وGoogle OAuth من لوحة Render. لا تضع الأسرار في `render.yaml` أو المستودع. راجع `RENDER_DEPLOY_AR.md` للتفاصيل.

## حدود مهمة قبل الإنتاج

نجاح الاختبارات المحلية لا يثبت اتصال الخدمات الخارجية. قبل الإطلاق العام يجب اختبار MongoDB وR2 وOpenAI والبريد وGoogle OAuth وSocket.IO من بيئة النشر، والتحقق من سياسة الخصوصية والاحتفاظ بالوسائط والنسخ الاحتياطي ومعدلات الاستخدام. رفع الوسائط يحتاج إعداد R2 صحيحاً ونطاقاً عاماً للملفات.
