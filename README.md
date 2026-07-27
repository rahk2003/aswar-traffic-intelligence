# منصة ذكاء المواقع الإعلانية

منصة ثنائية اللغة لتحليل المواقع الإعلانية ومقارنتها باستخدام
OpenStreetMap وTomTom، مع طبقة اختيارية لتصنيف سطح الأرض عبر
Google Dynamic World وصورة مرئية من Copernicus Sentinel-2. تبقى
درجة الحركة المرورية محسوبة في الخادم من مصادرها الحالية، ولا
تدخل بيانات الأقمار الصناعية في الدرجة.

## التشغيل المحلي

يتطلب المشروع Python 3.11 أو أحدث وNode.js وPostgreSQL/PostGIS
بالإعدادات المستخدمة في الخادم.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

وفي نافذة أخرى:

```bash
cd frontend
npm install
npm run dev
```

عنوان API الافتراضي للواجهة هو `http://127.0.0.1:8000`. يمكن تغييره
عبر `VITE_API_BASE_URL`.

## Satellite Context Analysis

تحليل صور الأقمار الصناعية طبقة تفسيرية مستقلة تستخدم مصدرين:

- يستخدم الخادم `GOOGLE/DYNAMICWORLD/V1` عبر Google Earth Engine
  للتصنيف الرئيسي. يحسب `reduceRegion` متوسط حزم احتمالات الفئات
  داخل دائرة الموقع بدقة 10 أمتار.
- يعرض خمس نتائج مجموعها 100% تقريبًا: المناطق المبنية، والتربة
  المكشوفة، والغطاء النباتي، والمياه، والثلوج أو الجليد.
- يجمع الغطاء النباتي احتمالات `trees` و`grass` و
  `flooded_vegetation` و`crops` و`shrub_and_scrub`.
- تُعرض موثوقية التصنيف منفصلة اعتمادًا على متوسط احتمال الفئة
  الأعلى وتغطية البكسلات الصالحة. لا تُحوّل البكسلات منخفضة
  الثقة إلى فئة مجهولة ولا تُحذف احتمالاتها.
- يبحث Copernicus Catalog API عن أحدث مشهد Sentinel-2 مناسب بغيوم
  لا تتجاوز 20% خلال
  90 يومًا، ثم يوسّع البحث إلى 180 و365 يومًا عند الحاجة.
- ينشئ Copernicus Process API صورة بألوان طبيعية بحجم 512×512 من الحزم
  B02 وB03 وB04، وتُعرض الصورة عبر Proxy في الخادم حتى لا تصل
  بيانات المصادقة إلى المتصفح.
- يحسب Copernicus Statistical API مؤشرات NDVI وNDBI وBSI كمؤشرات
  مساندة فقط؛ لا تُستخدم هذه المؤشرات لتحديد نسب الفئات.
- يستبعد `dataMask` وفئات SCL الخاصة بعدم وجود البيانات وظلال
  الغيوم والغيوم المتوسطة والعالية والسحب الرقيقة والثلج أو الجليد.
- النتيجة لا تمثل عدد المركبات ولا تغيّر Traffic Score أو أوزانه.

### إعداد Copernicus وGoogle Earth Engine

أنشئ OAuth client في Copernicus Data Space Ecosystem، ثم أضف القيم
يدويًا إلى `backend/.env`:

```env
COPERNICUS_CLIENT_ID=...
COPERNICUS_CLIENT_SECRET=...
```

سجّل مشروع Google Cloud في Earth Engine وفعّل Earth Engine API،
ثم أنشئ Service Account واحفظ ملف اعتماده محليًا داخل مسار مستبعد
من Git، وأضف:

```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

لا يصل مفتاح Google أو بيانات Copernicus إلى الواجهة؛ جميع طلبات
Earth Engine وCopernicus تنفذ في الخادم فقط.

بقية عناوين API وحدود الغيوم والبحث والمهلة ومدة التخزين المؤقت
موثقة في `backend/.env.example`. مدة Cache الافتراضية ست ساعات.
إذا نقص إعداد أحد المصدرين، يستمر تحليل الموقع الأساسي طبيعيًا
وتظهر حالة منظمة بأن طبقة الأقمار الصناعية غير مفعّلة.

الإسناد: التصنيف من Google Dynamic World عبر Google Earth Engine،
والصورة والمؤشرات المساندة من Sentinel-2 Level-2A عبر Copernicus
Data Space Ecosystem.

## الاختبارات

لا تتصل اختبارات الوحدة بالإنترنت؛ تُستبدل خدمات Earth Engine
وCopernicus ببدائل اختبارية. يجب إجراء اختبار تكامل حقيقي منفصل
عند ضبط بيانات الاعتماد.

```bash
cd backend
python -m pytest -q

cd ../frontend
npm run lint
npm run build
```

لاختبار التحليل الحقيقي عبر خمس فئات مختلفة من المواقع وقياس زمن
الكود الداخلي بصورة منفصلة عن زمن الخدمات الخارجية:

```bash
cd backend
python -m scripts.validate_multiple_locations --radius 500
python -m scripts.measure_performance --iterations 25
python -m scripts.measure_satellite --radius 500
```

يمكن ضبط مهل OpenStreetMap وTomTom من `backend/.env` عبر المتغيرات
الموثقة في `backend/.env.example`. إذا تعطل مصدر واحد فقط، يعيد
تحليل النقطة نتيجة جزئية مع `data_warnings` ولا يحسب Traffic Score
من بيانات ناقصة. أما تعطل المصدرين معًا فيرجع خطأ 502 مفهومًا.
