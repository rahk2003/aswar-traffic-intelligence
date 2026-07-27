import i18n from "i18next";
import {
  initReactI18next,
} from "react-i18next";


const savedLanguage =
  localStorage.getItem(
    "advertising-location-intelligence-language",
  )
  || "ar";


const sharedRoadTypesArabic = {
  motorway: "طريق سريع",
  motorway_link: "مدخل أو مخرج طريق سريع",
  trunk: "طريق رئيسي سريع",
  trunk_link: "وصلة طريق رئيسي سريع",
  primary: "طريق رئيسي",
  primary_link: "وصلة طريق رئيسي",
  secondary: "طريق ثانوي",
  secondary_link: "وصلة طريق ثانوي",
  tertiary: "طريق فرعي",
  tertiary_link: "وصلة طريق فرعي",
  residential: "شارع سكني",
  living_street: "شارع داخلي",
  service: "طريق خدمة",
  unclassified: "طريق غير مصنف",
  footway: "ممر مشاة",
  path: "مسار",
  track: "مسار غير معبّد",
};


const sharedRoadTypesEnglish = {
  motorway: "Motorway",
  motorway_link: "Motorway access road",
  trunk: "Major highway",
  trunk_link: "Major highway connection",
  primary: "Primary road",
  primary_link: "Primary road connection",
  secondary: "Secondary road",
  secondary_link: "Secondary road connection",
  tertiary: "Local distributor road",
  tertiary_link: "Local road connection",
  residential: "Residential street",
  living_street: "Local access street",
  service: "Service road",
  unclassified: "Unclassified road",
  footway: "Pedestrian path",
  path: "Path",
  track: "Track",
};


const serviceCategoriesArabic = {
  restaurant: "مطاعم",
  cafe: "مقاهٍ",
  fast_food: "وجبات سريعة",
  pharmacy: "صيدليات",
  hospital: "مستشفيات",
  clinic: "عيادات",
  doctors: "مراكز طبية",
  dentist: "عيادات أسنان",
  school: "مدارس",
  kindergarten: "رياض أطفال",
  college: "كليات",
  university: "جامعات",
  mosque: "مساجد",
  place_of_worship: "مساجد",
  bank: "بنوك",
  atm: "أجهزة صراف آلي",
  fuel: "محطات وقود",
  parking: "مواقف سيارات",
  parking_space: "مساحات مواقف السيارات",
  marketplace: "أسواق",
  supermarket: "متاجر كبرى",
  convenience: "متاجر تموينات",
  bakery: "مخابز",
  mall: "مراكز تسوق",
  clothes: "متاجر ملابس",
  hotel: "فنادق",
  guest_house: "دور ضيافة",
  attraction: "معالم سياحية",
  cinema: "دور سينما",
  theatre: "مسارح",
  travel_agency: "وكالات سفر",
  car_repair: "ورش صيانة سيارات",
  car_wash: "مغاسل سيارات",
  childcare: "مراكز رعاية أطفال",
  dry_cleaning: "مغاسل ملابس",
  laundry: "مغاسل ملابس",
  electronics: "متاجر إلكترونيات",
  mobile_phone: "متاجر هواتف",
  furniture: "متاجر أثاث",
  hardware: "متاجر أدوات ومعدات",
  books: "مكتبات بيع الكتب",
  stationery: "متاجر قرطاسية",
  beauty: "مراكز تجميل",
  hairdresser: "صالونات",
  optician: "متاجر نظارات",
  veterinary: "عيادات بيطرية",
  post_office: "مكاتب بريد",
  police: "مراكز شرطة",
  fire_station: "مراكز إطفاء",
  library: "مكتبات عامة",
  community_centre: "مراكز مجتمعية",
  fitness_centre: "مراكز لياقة",
  sports_centre: "مراكز رياضية",
  swimming_pool: "مسابح",
  playground: "ملاعب أطفال",
  bus_station: "محطات حافلات",
  taxi: "مواقف سيارات أجرة",
  charging_station: "محطات شحن مركبات",
  theme_park: "مدن ترفيهية",
  museum: "متاحف",
  viewpoint: "مواقع إطلالة",
};


const resources = {
  ar: {
    translation: {
      brand: {
        name: "منصة ذكاء المواقع الإعلانية",
        subtitle: "",
      },

      nav: {
        home: "الرئيسية",
        map: "تحليل المواقع",
        compare: "مقارنة المواقع",
        label: "التنقل الرئيسي",
      },

      language: {
        selector: "اختيار اللغة",
        arabic: "العربية",
        english: "الإنجليزية",
      },

      common: {
        unavailable: "غير متوفر",
        meters: "م",
        metersLong: "متر",
        kilometersPerSquareKm: "كم/كم²",
        kilometersPerHour: "كم/س",
        percent: "٪",
      },

      home: {
        eyebrow: "قرارات إعلانية مدعومة ببيانات حقيقية",
        title: "افهم حركة المدينة قبل اختيار موقع إعلانك",
        description:
          "تحلل المنصة شبكة الطرق والخدمات المحيطة وحالة المرور المباشرة، لتمنحك قراءة واضحة وقابلة للمقارنة لأي موقع إعلاني.",
        analyzeCta: "تحليل موقع على الخريطة",
        compareCta: "مقارنة موقعين",
        realData: "بيانات حقيقية",
        bilingual: "واجهة عربية وإنجليزية",
        noEstimatesHidden: "منهجية واضحة",
        illustrationAlt:
          "تصور تحليلي لشبكة طرق في الرياض ولوحة إعلانية ومؤشرات حركة المرور",
        scoreRangeLabel: "درجة الحركة المرورية",
        scoreRangeNote: "قراءة موحّدة للموقع",
        liveContext: "حالة المرور الآن",
        featuresEyebrow: "ذكاء المواقع الإعلانية",
        featuresTitle:
          "المؤشرات الأهم في شاشة تحليل واحدة",
        featuresDescription:
          "من اختيار النقطة إلى تفسير النتيجة، تعرض المنصة بيانات المكان كما تصل من مصادرها الفعلية دون قيم تجريبية.",
        features: {
          live: {
            title: "حالة المرور الآن",
            text:
              "قراءة السرعة الحالية والانسياب الحر ونسبة الازدحام عبر بيانات TomTom.",
          },
          spatial: {
            title: "تحليل مكاني للطرق",
            text:
              "قياس كثافة شبكة الطرق والتقاطعات والخدمات المحيطة اعتمادًا على هندسة OpenStreetMap.",
          },
          comparison: {
            title: "مقارنة واضحة للمواقع",
            text:
              "تحليل موقعين بالتوازي وعرض الفروق التي تدعم قرار الإعلان الخارجي.",
          },
        },
        intelligenceEyebrow: "أدوات تساعدك على فهم النتيجة",
        intelligenceTitle:
          "صورة أقمار صناعية وتفسير ذكي لكل موقع",
        intelligenceDescription:
          "بعد حساب مؤشرات الطرق والمرور، تضيف المنصة تحليلًا لطبيعة المنطقة ومساعدًا يشرح ما تعنيه النتيجة لقرار الإعلان.",
        satelliteBadge: "تحليل صور الأقمار الصناعية",
        satelliteTitle:
          "افهم طبيعة المنطقة المحيطة بالموقع",
        satelliteDescription:
          "تعرض المنصة صورة حديثة من Sentinel-2، ثم تحلل طبيعة سطح الأرض داخل النطاق المختار.",
        satelliteImage:
          "صورة بألوان طبيعية من أقمار Sentinel-2 التابعة لبرنامج Copernicus.",
        satelliteModel:
          "نموذج Dynamic World يقدّر نسب المباني والتربة والغطاء النباتي والمياه.",
        satelliteEngine:
          "تُحسب النسب داخل الخادم باستخدام Google Earth Engine بدقة مكانية تبلغ 10 أمتار.",
        assistantBadge: "المساعد الذكي",
        assistantTitle:
          "اسأل عن ملاءمة الموقع وأسباب النتيجة",
        assistantDescription:
          "يقرأ المساعد بيانات الموقع الحالية ويحوّل الأرقام والمؤشرات إلى تفسير واضح ومباشر.",
        assistantSuitability:
          "يوضح هل المؤشرات تدعم ملاءمة الموقع للإعلان ولماذا.",
        assistantFactors:
          "يشرح أقوى العوامل وأضعفها وكيف يمكن تحسين دقة التقييم.",
        assistantScope:
          "يعتمد على نتيجة الموقع المعروضة ولا يغيّر درجة الحركة أو طريقة حسابها.",
        methodEyebrow: "منهجية التحليل",
        methodTitle: "مصادر واضحة، ولكل مصدر دور محدد",
        methodDescription:
          "تُبنى درجة الحركة من بيانات الطرق والمرور. ويُعرض تحليل الأقمار الصناعية والمساعد كطبقتين للتفسير، من دون تغيير الدرجة.",
        methodOsm: "شبكة الطرق والخدمات",
        methodTomtom: "حالة المرور الحالية",
        methodScore: "نتيجة من 100",
        ctaEyebrow: "ابدأ من موقع فعلي",
        ctaTitle:
          "اختر نقطة على الخريطة واعرف حركة المرور وكثافة الطرق والخدمات القريبة منها.",
      },

      map: {
        eyebrow: "تحليل مكاني مباشر",
        title: "تحليل موقع إعلاني على الخريطة",
        description:
          "اختر أي نقطة لقراءة حركة المرور وشبكة الطرق والخدمات المحيطة بها ضمن نطاق واضح.",
        mapLabel: "خريطة اختيار الموقع الإعلاني",
        mapInstruction: "اضغط على الخريطة لتحديد الموقع",
        radius: "نطاق التحليل",
        radiusDescription:
          "اختر المسافة المحيطة بموقع الإعلان",
        radiusCurrent:
          "نصف قطر التحليل: {{radius}} متر",
        analysisRadius: "نطاق التحليل",
        selectTitle: "اختر موقعًا",
        selectDescription:
          "اضغط على أي نقطة في الخريطة، ثم ابدأ التحليل.",
        selectedLocation: "الموقع المحدد",
        clear: "مسح الاختيار",
        latitude: "خط العرض",
        longitude: "خط الطول",
        readyTitle: "الموقع جاهز للتحليل",
        readyDescription:
          "ستجمع المنصة بيانات الطرق والخدمات من OpenStreetMap، وحالة المرور المباشرة من TomTom، ثم تعرض درجة الموقع.",
        analyze: "تحليل الموقع",
        loadingTitle: "جارٍ تحليل الموقع",
        loadingDescription:
          "يتم الآن جلب البيانات مباشرة من مصادرها، وقد يستغرق ذلك بضع ثوانٍ.",
        loadingRoads: "تحليل شبكة الطرق",
        loadingServices: "حصر الخدمات والمرافق القريبة",
        loadingTraffic: "قراءة حالة المرور الحالية",
        loadingScore: "حساب درجة الحركة المرورية",
        resultsEyebrow: "نتيجة التحليل",
        resultsTitle: "مؤشرات الموقع المختار",
        newLocation: "تحليل موقع آخر",
        score: "درجة الحركة المرورية",
        outOf100: "من 100",
        analysisDetails: "تفاصيل الموقع",
        roadDensity: "كثافة شبكة الطرق",
        intersections: "التقاطعات المرورية المقدّرة",
        nearbyServices: "الخدمات والمرافق القريبة",
        trafficSignals:
          "نقاط الإشارات المرورية المسجلة",
        currentSpeed: "السرعة الحالية",
        freeFlowSpeed: "سرعة الانسياب الحر",
        congestion: "نسبة الازدحام",
        roadType: "تصنيف أقرب طريق",
        roadName: "اسم أقرب طريق",
        roadDistance: "المسافة إلى أقرب طريق",
        estimatesTooltip:
          "قيم كثافة الطرق والتقاطعات ونقاط الإشارات تقديرات مشتقة من هندسة ووسوم OpenStreetMap المتاحة ضمن نطاق التحليل.",
        dataSources: "مصادر البيانات",
        osmSource:
          "OpenStreetMap للتحليل المكاني والخدمات",
        tomtomSource:
          "TomTom لحالة المرور المباشرة",
        contextNote:
          "تعتمد النتيجة على خصائص الموقع وحالة المرور الحالية. لا يتوفر عدّ رسمي للمركبات خلال 24 ساعة للنقاط المختارة مباشرة من الخريطة.",
      },

      dashboard: {
        eyebrow: "لوحة ذكاء الموقع",
        title: "لوحة مؤشرات الموقع الإعلاني",
        description:
          "قراءة مرئية للعوامل التي كوّنت النتيجة، مع تقدير لنشاط الموقع وملخص يساعد على تفسير ملاءمته الإعلانية.",
        loading: "جارٍ تجهيز لوحة المؤشرات…",
        trafficActivity:
          "النشاط المروري التقديري خلال اليوم",
        trafficActivityNote:
          "منحنى تقديري مبني على درجة الموقع والازدحام الحالي، ولا يمثل عددًا فعليًا أو رسميًا للمركبات.",
        trafficActivityNoteWithHistorical:
          "يستفيد التقييم من إجمالي العد الفعلي للمركبات خلال ٢٤ ساعة، أما توزيع النشاط على ساعات اليوم في هذا المنحنى فهو تقديري لعدم توفر قراءات منفصلة لكل ساعة.",
        estimatedData: "بيانات تقديرية",
        activityIndex: "مؤشر النشاط",
        activityScale:
          "مقياس نشاط تقديري من صفر إلى مئة",
        trafficActivityChartLabel:
          "رسم للنشاط المروري التقديري خلال فترات اليوم",
        influencingFactors:
          "العوامل المؤثرة في درجة الحركة",
        backendFactors: "درجات الخادم الفعلية",
        factorScale:
          "درجة كل عامل من مئة",
        trafficFactorsChartLabel:
          "رسم درجات العوامل المستخدمة في حساب النتيجة",
        factorScore: "درجة العامل",
        factorWeight:
          "وزن العامل في النتيجة: {{weight}}٪",
        weightUnavailable:
          "وزن العامل غير متوفر",
        factorsNote:
          "تعرض الأعمدة درجات العوامل المحسوبة في الخادم من 100. مرّر على كل عامل لعرض وزنه الفعلي في النتيجة.",
        chartUnavailable:
          "لا تتوفر بيانات كافية لعرض هذا الرسم.",
        times: {
          sixAm: "٦ ص",
          nineAm: "٩ ص",
          noon: "١٢ ظ",
          threePm: "٣ م",
          sixPm: "٦ م",
          ninePm: "٩ م",
        },
        factors: {
          roadType: "نوع الطريق",
          roadDensity: "كثافة الطرق",
          intersections: "التقاطعات",
          services: "الخدمات القريبة",
          liveTraffic: "الازدحام المباشر",
          historicalVolume: "حجم المرور التاريخي",
        },
        locationSummary: "الملخص النهائي",
        summaryTitle: "ماذا تعني نتيجة هذا الموقع؟",
        suitability: {
          strong:
            "ملاءمة إعلانية تقديرية مرتفعة",
          promising: "قد يكون مناسبًا للإعلان",
          balanced:
            "ملاءمة تحتاج تقييمًا إضافيًا",
          limited:
            "ملاءمة إعلانية تقديرية محدودة",
          unavailable: "لا يمكن تحديد الملاءمة",
        },
        summaryIntro:
          "حصل الموقع على درجة حركة مرورية {{score}} من 100، ويصنّف ضمن «{{level}}».",
        summaryUnavailable:
          "لم تتوفر درجة حركة مكتملة لهذا الموقع، لذلك لا يمكن تقديم قراءة نهائية للملاءمة.",
        assessment: {
          strong:
            "تشير المؤشرات المتاحة إلى فرصة قوية نسبيًا للإعلان الخارجي، مع ضرورة التحقق ميدانيًا من وضوح اللوحة واتجاهها وتكلفة الموقع.",
          promising:
            "تشير المؤشرات إلى أن الموقع قد يكون مناسبًا للإعلان الخارجي وفق سياقه المروري والمكاني الحالي.",
          balanced:
            "تعرض المؤشرات نقاط قوة وحدودًا متقاربة؛ وقد يحتاج الموقع إلى مقارنة بدائل والتحقق الميداني قبل اتخاذ القرار.",
          limited:
            "تشير البيانات الحالية إلى تعرض مروري أو نشاط مكاني أقل، لذلك قد تكون ملاءمة الموقع الإعلانية محدودة مقارنة بخيارات أقوى.",
          unavailable:
            "لا تتوفر بيانات كافية للحكم على ملاءمة الموقع الإعلانية وفق المنهج الحالي.",
        },
        whyThisAssessment:
          "لماذا ظهرت هذه النتيجة؟",
        factorReason:
          "{{factor}} — مستوى {{level}} ضمن نموذج التحليل.",
        factorTones: {
          strong: "قوي",
          moderate: "متوسط",
          weak: "منخفض",
        },
        nearestRoad: "أقرب طريق",
        liveTrafficReading:
          "قراءة المرور المباشرة",
        congestionReading:
          "ازدحام حالي {{congestion}}٪",
        available: "متوفرة",
        summaryDisclaimer:
          "هذه ملاءمة تقديرية مبنية على بيانات الطرق والخدمات وحالة المرور المتاحة وقت التحليل. لا تمثل عدًا رسميًا للمركبات ولا تغني عن التحقق من الرؤية والتراخيص والتكلفة والجمهور المستهدف.",
        mapSummary: "ملخص الموقع على الخريطة",
      },

      satellite: {
        title: "تحليل صور الأقمار الصناعية للموقع",
        description:
          "تصنيف احتمالي لطبيعة سطح الأرض داخل نطاق التحليل باستخدام نموذج Dynamic World المدرّب على صور Sentinel-2.",
        loading:
          "جارٍ جلب صورة Sentinel-2 وحساب احتمالات Dynamic World داخل نطاق الموقع…",
        retry: "إعادة المحاولة",
        notConfiguredTitle:
          "تحليل الأقمار الصناعية غير مفعّل",
        notConfigured:
          "يمكن تفعيل هذه الطبقة بإضافة إعدادات Copernicus وGoogle Earth Engine إلى الخادم.",
        noImageryTitle:
          "لا توجد صورة مناسبة حاليًا",
        noImagery:
          "لم تتوفر صورة حديثة ضمن حد الغيوم المحدد. يمكنك إعادة المحاولة لاحقًا.",
        temporarilyUnavailableTitle:
          "تعذر جلب بيانات الأقمار الصناعية",
        temporarilyUnavailable:
          "خدمة صور الأقمار الصناعية غير متاحة مؤقتًا. لم تتأثر نتيجة التحليل الأساسية.",
        imageAlt:
          "صورة بألوان طبيعية لنطاق الموقع من القمر الصناعي Sentinel-2",
        imageUnavailable:
          "تعذر عرض معاينة الصورة",
        trueColor: "صورة بألوان طبيعية",
        trueColorWithResolution:
          "ألوان طبيعية • دقة {{resolution}} م",
        previewResolutionNote:
          "مناسبة لفهم السياق العام للمنطقة، وليست لإظهار التفاصيل الدقيقة للمباني؛ دقة Sentinel-2 الأصلية ١٠ أمتار.",
        builtUp: "متوسط احتمال المناطق المبنية",
        bareSoil:
          "متوسط احتمال التربة أو الأرض المكشوفة",
        vegetation:
          "متوسط احتمال الغطاء النباتي",
        water: "متوسط احتمال المياه",
        other:
          "متوسط احتمال الثلوج أو الجليد",
        acquisitionDate: "تاريخ صورة Sentinel-2",
        classificationDate:
          "تاريخ تصنيف Dynamic World",
        cloudCover: "نسبة الغيوم في المشهد",
        resolution: "الدقة المكانية",
        confidence: "موثوقية التحليل",
        meanTopProbability:
          "متوسط احتمال الفئة الأعلى",
        probabilityTotal:
          "مجموع متوسطات الاحتمالات",
        confidenceHigh: "مرتفعة",
        confidenceModerate: "متوسطة",
        confidenceLow: "منخفضة",
        validPixels: "البكسلات الصالحة للتحليل",
        indices: "المؤشرات الطيفية المساندة",
        contextSummary: "قراءة سياق الموقع",
        summaries: {
          builtUp:
            "يعطي نموذج Dynamic World أعلى متوسط احتمال للمناطق المبنية داخل النطاق.",
          bareSoil:
            "يعطي نموذج Dynamic World أعلى متوسط احتمال للتربة أو الأرض المكشوفة داخل النطاق.",
          vegetation:
            "يعطي نموذج Dynamic World أعلى متوسط احتمال للغطاء النباتي داخل النطاق.",
          water:
            "يعطي نموذج Dynamic World أعلى متوسط احتمال للمياه داخل النطاق.",
          other:
            "يعطي نموذج Dynamic World أعلى متوسط احتمال للثلوج أو الجليد داخل النطاق.",
          unavailable:
            "لا تتوفر بكسلات صالحة كافية لتحديد السياق الغالب.",
        },
        summaryAdditions: {
          builtUp:
            "ويعطي Dynamic World أعلى متوسط احتمال للمناطق المبنية داخل النطاق.",
          bareSoil:
            "ويعطي Dynamic World أعلى متوسط احتمال للتربة أو الأرض المكشوفة داخل النطاق.",
          vegetation:
            "ويعطي Dynamic World أعلى متوسط احتمال للغطاء النباتي داخل النطاق.",
          water:
            "ويعطي Dynamic World أعلى متوسط احتمال للمياه داخل النطاق.",
          other:
            "ويعطي Dynamic World أعلى متوسط احتمال للثلوج أو الجليد داخل النطاق.",
        },
        confidenceLimitations:
          "أسباب انخفاض موثوقية التصنيف",
        limitations: {
          distributedProbabilities:
            "توزعت احتمالات Dynamic World على أكثر من فئة لسطح الأرض، مما خفّض موثوقية التصنيف.",
          lowValidPixels:
            "أدى انخفاض تغطية البكسلات الصالحة في Dynamic World إلى خفض موثوقية التصنيف.",
          differentDate:
            "استُخدمت أقرب نتيجة Dynamic World متاحة لأن تاريخها لم يطابق تاريخ صورة Sentinel-2 المعروضة تمامًا.",
          multipleFactors:
            "أدت عدة عوامل مرتبطة بجودة Dynamic World إلى خفض موثوقية التصنيف.",
        },
        aridEnvironmentWarning:
          "يعتمد التصنيف الرئيسي على متوسط حزم الاحتمال في Dynamic World. تُعرض NDVI وNDBI وBSI كمؤشرات مساندة فقط وليست أساس النسب.",
        source: "مصدر التصنيف الرئيسي",
        supportingSource:
          "مصدر الصورة والمؤشرات المساندة",
        trafficScoreNote:
          "هذه الطبقة سياق إضافي مستقل، ولا تدخل في حساب درجة الحركة المرورية ولا تمثل عدد المركبات.",
      },

      assistant: {
        kicker: "تفسير النتيجة",
        title: "المساعد الذكي",
        description:
          "اسأل عن الدرجة أو المرور أو الطرق والخدمات أو صورة القمر الصناعي. يجيب المساعد من بيانات الموقع الحالية ولا يغيّر الحساب.",
        suggestionsLabel: "أسئلة مقترحة",
        questions: {
          why_score:
            "لماذا حصل الموقع على هذه الدرجة؟",
          strongest_factor:
            "ما العامل الأقوى في النتيجة؟",
          weakest_factor:
            "ما العامل الأضعف؟",
          suitability:
            "هل الموقع مناسب للإعلان؟",
          satellite_context:
            "ماذا توضح صورة القمر الصناعي عن سياق الموقع؟",
          improve:
            "كيف يمكن تحسين دقة التقييم؟",
        },
        customLabel: "اكتب سؤالك",
        placeholder:
          "مثال: ما أثر الازدحام الحالي في النتيجة؟",
        send: "إرسال السؤال",
        loading: "جارٍ تفسير النتيجة…",
        yourQuestion: "سؤالك",
        answerLabel: "تفسير المساعد",
        aiSource:
          "أُنشئ التفسير عبر نموذج Ollama الاختياري.",
        localSource:
          "أُنشئ التفسير محليًا من نتيجة التحليل الحالية.",
        error:
          "تعذر إنشاء التفسير الآن. لم تتأثر نتيجة التحليل.",
        retry: "إعادة المحاولة",
        disclaimer:
          "التفسير مبسط وتقديري، ويقتصر على البيانات المعروضة لهذا الموقع. لا يمثل استشارة تجارية أو عدًا رسميًا للمركبات.",
      },

      report: {
        projectName:
          "منصة ذكاء المواقع الإعلانية",
        title: "تقرير تحليل موقع إعلاني",
        generated: "تاريخ إنشاء التقرير",
        pageNumber:
          "الصفحة {{page}} من {{total}}",
        footer:
          "تقرير آلي مبني على نتيجة التحليل الحالية",
        level: "تصنيف النشاط",
        locationDetails: "بيانات الموقع والنطاق",
        satelliteTitle:
          "سياق الموقع من القمر الصناعي",
        satelliteMethodology:
          "النسب هي متوسط حزم الاحتمال لنموذج Dynamic World داخل نطاق الموقع بدقة ١٠ أمتار. جُمعت الأشجار والعشب والنباتات المغمورة والمحاصيل والشجيرات ضمن الغطاء النباتي، بينما تظهر NDVI وNDBI وBSI كمؤشرات مساندة فقط. لا تدخل هذه الطبقة في حساب درجة الحركة المرورية.",
        satelliteEstimated:
          "متوسط احتمالات فئات سطح الأرض داخل نطاق التحليل",
        finalSummary: "الملخص النهائي",
        assistantExplanation:
          "تفسير سبب الدرجة",
        methodology: "المنهجية",
        methodologyText:
          "يجمع التحليل خصائص شبكة الطرق والخدمات القريبة من OpenStreetMap مع قراءة حالة المرور المباشرة من TomTom، ثم يعرض Traffic Score والعوامل والأوزان كما أعادها الخادم. الرسم اليومي تقدير مرئي مشتق من النتيجة الحالية وليس تعدادًا زمنيًا فعليًا.",
        disclaimerTitle: "تنبيه مهم",
        factorNote:
          "تعرض القائمة درجة كل عامل من 100 ووزنه الفعلي في النتيجة، من دون إعادة حساب الدرجة.",
        factorValues:
          "الدرجة: {{score}} من 100 • الوزن: {{weight}}",
        defaultExplanation:
          "بلغت درجة الموقع {{score}} من 100. كان العامل الأقوى «{{strongest}}» بدرجة {{strongestScore}}، بينما كان العامل الأضعف «{{weakest}}» بدرجة {{weakestScore}}. هذه قراءة تفسيرية للنتيجة الحالية فقط.",
        defaultExplanationUnavailable:
          "لا تتوفر درجات عوامل كافية لشرح سبب النتيجة تفصيليًا.",
        download: "تحميل تقرير PDF",
        generating: "جارٍ إنشاء التقرير…",
        success: "تم إنشاء التقرير وتنزيله.",
        error:
          "تعذر إنشاء ملف PDF. أعد المحاولة بعد قليل.",
        retry: "إعادة المحاولة",
      },

      services: {
        title: "تفاصيل الخدمات القريبة",
        summary:
          "تم العثور على {{count}} خدمة ضمن نطاق {{radius}} مترًا",
        empty:
          "لم تُرجع البيانات فئات خدمات تفصيلية لهذا الموقع.",
        categories: serviceCategoriesArabic,
      },

      coordinates: {
        title: "إدخال الإحداثيات",
        description:
          "اكتب خط العرض وخط الطول لتحديد الموقع مباشرة.",
        or: "أو أدخل الإحداثيات يدويًا",
        latitude: "خط العرض",
        longitude: "خط الطول",
        useCoordinates: "استخدام الإحداثيات",
        invalid:
          "أدخل خط عرض صحيحًا بين -90 و90، وخط طول بين -180 و180.",
      },

      compare: {
        eyebrow: "مقارنة المواقع",
        title: "قارن بين موقعين على الخريطة",
        description:
          "حدد موقعين فعليين، ثم حللهما بالتوازي لمقارنة درجة الحركة المرورية والسياق المكاني لكلٍ منهما.",
        mapTitle: "حدد الموقعين",
        mapLabel: "خريطة اختيار موقعين للمقارنة",
        selectingLocation:
          "الاختيار الحالي: الموقع {{location}}",
        selectionComplete:
          "اكتمل الاختيار — يمكنك استبدال أي موقع",
        locationa: "الموقع الأول",
        locationb: "الموقع الثاني",
        pointSelected: "تم تحديد النقطة",
        selectOnMap: "اضغط على الخريطة الآن",
        waitingSelection: "بانتظار الاختيار",
        clickMapHint: "حدد النقطة مباشرة من الخريطة",
        select: "تحديد الموقع",
        replace: "استبدال النقطة",
        clearPoint: "مسح النقطة",
        submit: "قارن الموقعين",
        analyzing: "جارٍ تحليل الموقعين",
        selectBoth:
          "يُتاح بدء المقارنة بعد تحديد الموقعين.",
        analyzingLocation: "جارٍ تحليل الموقع",
        analyzingLocationDescription:
          "يتم جلب بيانات الطرق والمرور لهذا الموقع.",
        recommendationTitle: "الموقع الأنسب للإعلان",
        recommendationA: "الموقع الأول هو الأنسب",
        recommendationB: "الموقع الثاني هو الأنسب",
        recommendationClose: "الموقعان متقاربان",
        recommendationInsufficient:
          "لا توجد بيانات كافية لتحديد الموقع الأنسب",
        winnerExplanation:
          "يظهر {{location}} ملاءمة أعلى للإعلان الخارجي وفق درجة الحركة المرورية والفروق الفعلية في سياق الموقع.",
        closeExplanation:
          "الفارق بين الموقعين محدود، لذلك لا توجد أفضلية واضحة اعتمادًا على البيانات الحالية.",
        insufficientExplanation:
          "لم تُرجع التحليلات درجات مكتملة لكلا الموقعين، لذلك لا يمكن تقديم توصية موثوقة.",
        scoreDifference: "فارق الدرجة",
        points: "نقاط",
        strongestReasons: "أبرز أسباب الأفضلية",
        estimateNote:
          "هذه التوصية تقديرية وتعتمد على بيانات المرور وسياق الموقع المتاحة وقت التحليل.",
        reasons: {
          score: "درجة حركة مرورية أعلى",
          density: "شبكة طرق أكثر كثافة",
          services: "خدمات ومرافق محيطة أكثر",
          congestion:
            "مستوى ازدحام أعلى ضمن القراءة الحالية",
          intersections:
            "عدد أكبر من التقاطعات المقدّرة",
          roadType: "تصنيف أقرب طريق أكثر ملاءمة",
          signals:
            "نقاط إشارات مرورية مسجلة أكثر",
        },
        detailsEyebrow: "مقارنة المؤشرات",
        detailsTitle: "تفاصيل الموقعين جنبًا إلى جنب",
        metric: "المؤشر",
        trafficLevel: "مستوى الحركة المرورية",
        speedNote:
          "تُعرض السرعات بوصفها مؤشرات وصفية؛ لا تُعامل السرعة الأعلى وحدها كأفضلية إعلانية.",
      },

      levels: {
        very_high: "نشاط مروري مرتفع جدًا",
        high: "نشاط مروري مرتفع",
        moderate: "نشاط مروري متوسط",
        low: "نشاط مروري منخفض",
        unknown: "المستوى غير محدد",
      },

      roadTypes: sharedRoadTypesArabic,

      errors: {
        title: "تعذر إكمال التحليل",
        partialTitle:
          "اكتمل التحليل بالبيانات المتاحة فقط",
        osm_unavailable:
          "تعذر جلب بيانات الطرق والخدمات من OpenStreetMap، لذلك لم تُحسب الدرجة.",
        traffic_unavailable:
          "تعذر جلب حالة المرور من TomTom، لذلك لم تُحسب الدرجة.",
        network:
          "تعذر الاتصال بالخادم. تأكد من تشغيل خدمة التحليل ثم أعد المحاولة.",
        timeout:
          "استغرق جلب البيانات وقتًا أطول من المتوقع. أعد المحاولة بعد قليل.",
        general:
          "حدث خطأ أثناء تحليل الموقع. أعد المحاولة بعد قليل.",
        retry: "إعادة المحاولة",
      },
    },
  },

  en: {
    translation: {
      brand: {
        name: "Advertising Location Intelligence Platform",
        subtitle: "",
      },

      nav: {
        home: "Home",
        map: "Location Analysis",
        compare: "Compare Locations",
        label: "Primary navigation",
      },

      language: {
        selector: "Language selector",
        arabic: "Arabic",
        english: "English",
      },

      common: {
        unavailable: "Not available",
        meters: "m",
        metersLong: "meters",
        kilometersPerSquareKm: "km/km²",
        kilometersPerHour: "km/h",
        percent: "%",
      },

      home: {
        eyebrow: "Real data for outdoor decisions",
        title:
          "Understand city movement before choosing your advertising site",
        description:
          "The platform analyzes the surrounding road network, nearby activity, and live traffic context to give every advertising location a clear, comparable reading.",
        analyzeCta: "Analyze a map location",
        compareCta: "Compare two locations",
        realData: "Real data",
        bilingual: "Arabic and English",
        noEstimatesHidden: "Transparent methodology",
        illustrationAlt:
          "Analytical view of Riyadh roads, a roadside billboard, and traffic indicators",
        scoreRangeLabel: "Traffic Score",
        scoreRangeNote: "One consistent site reading",
        liveContext: "Traffic conditions now",
        featuresEyebrow: "Advertising location intelligence",
        featuresTitle:
          "The signals that matter, in one analytical view",
        featuresDescription:
          "From selecting a point to interpreting the result, the platform displays data returned by its real sources without demo values.",
        features: {
          live: {
            title: "Current traffic conditions",
            text:
              "Read current speed, free-flow speed, and congestion using TomTom traffic data.",
          },
          spatial: {
            title: "Spatial road analysis",
            text:
              "Measure road density, intersections, and surrounding services from OpenStreetMap geometry.",
          },
          comparison: {
            title: "Location comparison",
            text:
              "Analyze two sites in parallel and see the differences that support an outdoor advertising decision.",
          },
        },
        intelligenceEyebrow:
          "Tools that help explain the result",
        intelligenceTitle:
          "Satellite imagery and an intelligent explanation for every site",
        intelligenceDescription:
          "After calculating road and traffic indicators, the platform adds a view of the surrounding land and an assistant that explains what the result means for an advertising decision.",
        satelliteBadge: "Satellite image analysis",
        satelliteTitle:
          "Understand the area surrounding the site",
        satelliteDescription:
          "The platform displays recent Sentinel-2 imagery, then analyzes land cover inside the selected radius.",
        satelliteImage:
          "A natural-color image from the Copernicus Sentinel-2 satellites.",
        satelliteModel:
          "Dynamic World estimates the share of built area, bare ground, vegetation, and water.",
        satelliteEngine:
          "Probabilities are calculated on the backend with Google Earth Engine at 10-meter spatial resolution.",
        assistantBadge: "Intelligent assistant",
        assistantTitle:
          "Ask about site suitability and the reasons behind the result",
        assistantDescription:
          "The assistant reads the current site data and turns its numbers and indicators into a direct explanation.",
        assistantSuitability:
          "Explains whether the indicators support advertising suitability and why.",
        assistantFactors:
          "Identifies the strongest and weakest factors and ways to improve assessment quality.",
        assistantScope:
          "Uses the displayed result without changing the Traffic Score or its calculation.",
        methodEyebrow: "Analysis methodology",
        methodTitle:
          "Clear sources, each with a defined role",
        methodDescription:
          "Road and traffic data build the Traffic Score. Satellite analysis and the assistant are explanatory layers and do not change that score.",
        methodOsm: "Roads and nearby services",
        methodTomtom: "Current traffic conditions",
        methodScore: "A result out of 100",
        ctaEyebrow: "Start with a real location",
        ctaTitle:
          "Choose a point on the map and see its traffic conditions, road density, and nearby services.",
      },

      map: {
        eyebrow: "Live geospatial analysis",
        title: "Analyze an Advertising Location",
        description:
          "Select any point to read its traffic conditions, road network, and surrounding activity within a defined radius.",
        mapLabel:
          "Map for selecting an advertising location",
        mapInstruction:
          "Click the map to select a location",
        radius: "Analysis radius",
        radiusDescription:
          "Select the area surrounding the advertising location",
        radiusCurrent:
          "Analysis radius: {{radius}} meters",
        analysisRadius: "Analysis radius",
        selectTitle: "Select a location",
        selectDescription:
          "Click any point on the map, then start the analysis.",
        selectedLocation: "Selected location",
        clear: "Clear selection",
        latitude: "Latitude",
        longitude: "Longitude",
        readyTitle: "Location ready for analysis",
        readyDescription:
          "The platform will retrieve road and service data from OpenStreetMap, read live traffic from TomTom, and display the site score.",
        analyze: "Analyze Location",
        loadingTitle: "Analyzing location",
        loadingDescription:
          "Data is being retrieved directly from its sources. This may take a few seconds.",
        loadingRoads: "Analyzing the road network",
        loadingServices: "Identifying nearby services",
        loadingTraffic: "Reading live traffic conditions",
        loadingScore: "Calculating the Traffic Score",
        resultsEyebrow: "Analysis result",
        resultsTitle: "Selected Location Insights",
        newLocation: "Analyze Another Location",
        score: "Traffic Score",
        outOf100: "out of 100",
        analysisDetails: "Location details",
        roadDensity: "Road network density",
        intersections: "Estimated road intersections",
        nearbyServices:
          "Nearby services and facilities",
        trafficSignals:
          "Recorded traffic-signal points",
        currentSpeed: "Current speed",
        freeFlowSpeed: "Free-flow speed",
        congestion: "Congestion",
        roadType: "Nearest road classification",
        roadName: "Nearest road name",
        roadDistance: "Distance to nearest road",
        estimatesTooltip:
          "Road density, intersections, and traffic-signal points are estimates derived from available OpenStreetMap geometry and tags within the analysis radius.",
        dataSources: "Data sources",
        osmSource:
          "OpenStreetMap for spatial and service analysis",
        tomtomSource:
          "TomTom for live traffic conditions",
        contextNote:
          "This result uses the location context and current traffic conditions. An official 24-hour vehicle count is not available for arbitrary map points.",
      },

      dashboard: {
        eyebrow: "Location intelligence dashboard",
        title: "Advertising Location Dashboard",
        description:
          "A visual reading of the factors behind the score, estimated site activity, and a final interpretation of advertising suitability.",
        loading: "Preparing the dashboard…",
        trafficActivity:
          "Estimated Traffic Activity During the Day",
        trafficActivityNote:
          "This estimated curve is derived from the site score and current congestion. It is not an actual or official vehicle count.",
        trafficActivityNoteWithHistorical:
          "The assessment uses the actual 24-hour vehicle total. Its distribution across the hours shown in this curve remains estimated because separate hourly readings are not available.",
        estimatedData: "Estimated data",
        activityIndex: "Activity index",
        activityScale:
          "Estimated activity scale from zero to one hundred",
        trafficActivityChartLabel:
          "Chart of estimated traffic activity across the day",
        influencingFactors:
          "Factors Influencing the Traffic Score",
        backendFactors: "Actual backend scores",
        factorScale:
          "Each factor scored out of one hundred",
        trafficFactorsChartLabel:
          "Chart of factor scores used to calculate the result",
        factorScore: "Factor score",
        factorWeight:
          "Weight in the result: {{weight}}%",
        weightUnavailable:
          "Factor weight unavailable",
        factorsNote:
          "Bars show the backend-calculated factor scores out of 100. Hover over a factor to see its actual weight in the result.",
        chartUnavailable:
          "There is not enough data to display this chart.",
        times: {
          sixAm: "6 AM",
          nineAm: "9 AM",
          noon: "12 PM",
          threePm: "3 PM",
          sixPm: "6 PM",
          ninePm: "9 PM",
        },
        factors: {
          roadType: "Road type",
          roadDensity: "Road density",
          intersections: "Intersections",
          services: "Nearby services",
          liveTraffic: "Live congestion",
          historicalVolume: "Historical traffic volume",
        },
        locationSummary: "Final summary",
        summaryTitle: "What does this result mean?",
        suitability: {
          strong:
            "High estimated advertising suitability",
          promising:
            "Potentially suitable for advertising",
          balanced:
            "Suitability needs further evaluation",
          limited:
            "Limited estimated advertising suitability",
          unavailable:
            "Suitability cannot be determined",
        },
        summaryIntro:
          "The location received a Traffic Score of {{score}} out of 100 and is classified as “{{level}}.”",
        summaryUnavailable:
          "A complete Traffic Score was not available, so a final suitability reading cannot be provided.",
        assessment: {
          strong:
            "Available indicators suggest relatively strong outdoor advertising potential, subject to an on-site check of visibility, orientation, and cost.",
          promising:
            "The indicators suggest this site may be suitable for outdoor advertising based on its current traffic and spatial context.",
          balanced:
            "The indicators show a balanced mix of strengths and limitations. Comparing alternatives and conducting an on-site review may be useful.",
          limited:
            "Current data suggests lower traffic exposure or surrounding activity, so the site may be less suitable than stronger alternatives.",
          unavailable:
            "There is not enough data to assess the site's advertising suitability using the current method.",
        },
        whyThisAssessment:
          "Why did the site receive this result?",
        factorReason:
          "{{factor}} — {{level}} level in the analysis model.",
        factorTones: {
          strong: "strong",
          moderate: "moderate",
          weak: "low",
        },
        nearestRoad: "Nearest road",
        liveTrafficReading:
          "Live traffic reading",
        congestionReading:
          "{{congestion}}% current congestion",
        available: "Available",
        summaryDisclaimer:
          "This is an estimated suitability reading based on available road, service, and traffic data at analysis time. It is not an official vehicle count and does not replace checks for visibility, permits, cost, or target audience.",
        mapSummary: "Map location summary",
      },

      satellite: {
        title: "Satellite Context Analysis",
        description:
          "A probability-based land-cover classification within the analysis radius using the Dynamic World model trained on Sentinel-2 imagery.",
        loading:
          "Retrieving Sentinel-2 imagery and averaging Dynamic World probabilities within the location radius…",
        retry: "Try again",
        notConfiguredTitle:
          "Satellite analysis is not enabled",
        notConfigured:
          "This layer can be enabled by adding Copernicus and Google Earth Engine settings to the backend.",
        noImageryTitle:
          "No suitable imagery is currently available",
        noImagery:
          "No recent image met the configured cloud-cover limit. You can try again later.",
        temporarilyUnavailableTitle:
          "Satellite context could not be retrieved",
        temporarilyUnavailable:
          "The satellite service is temporarily unavailable. The main location result was not affected.",
        imageAlt:
          "Sentinel-2 true-color satellite image of the analysis area",
        imageUnavailable:
          "The image preview could not be displayed",
        trueColor: "True-color image",
        trueColorWithResolution:
          "Natural color • {{resolution}} m resolution",
        previewResolutionNote:
          "Suitable for understanding the area's general context, not fine building detail; Sentinel-2's native resolution is 10 meters.",
        builtUp: "Mean built probability",
        bareSoil:
          "Mean bare-ground probability",
        vegetation:
          "Mean vegetation probability",
        water: "Mean water probability",
        other:
          "Mean snow-or-ice probability",
        acquisitionDate:
          "Sentinel-2 image date",
        classificationDate:
          "Dynamic World classification date",
        cloudCover: "Scene cloud cover",
        resolution: "Spatial resolution",
        confidence: "Analysis confidence",
        meanTopProbability:
          "Mean top-class probability",
        probabilityTotal:
          "Probability mean total",
        confidenceHigh: "High",
        confidenceModerate: "Moderate",
        confidenceLow: "Low",
        validPixels: "Valid analyzed pixels",
        indices: "Supporting spectral indices",
        contextSummary: "Location context reading",
        summaries: {
          builtUp:
            "Dynamic World gives built area the highest mean probability within the radius.",
          bareSoil:
            "Dynamic World gives bare ground the highest mean probability within the radius.",
          vegetation:
            "Dynamic World gives vegetation the highest mean probability within the radius.",
          water:
            "Dynamic World gives water the highest mean probability within the radius.",
          other:
            "Dynamic World gives snow or ice the highest mean probability within the radius.",
          unavailable:
            "There are not enough valid pixels to identify the dominant context.",
        },
        summaryAdditions: {
          builtUp:
            "Dynamic World gives built area the highest mean probability within the selected radius.",
          bareSoil:
            "Dynamic World gives bare ground the highest mean probability within the selected radius.",
          vegetation:
            "Dynamic World gives vegetation the highest mean probability within the selected radius.",
          water:
            "Dynamic World gives water the highest mean probability within the selected radius.",
          other:
            "Dynamic World gives snow or ice the highest mean probability within the selected radius.",
        },
        confidenceLimitations:
          "Reasons for reduced classification confidence",
        limitations: {
          distributedProbabilities:
            "Dynamic World probabilities are spread across multiple land-cover classes, reducing classification confidence.",
          lowValidPixels:
            "Low Dynamic World valid-pixel coverage reduced classification confidence.",
          differentDate:
            "The nearest available Dynamic World result was used because its date did not exactly match the displayed Sentinel-2 image.",
          multipleFactors:
            "Multiple Dynamic World quality factors reduced classification confidence.",
        },
        aridEnvironmentWarning:
          "The primary classification uses mean Dynamic World probability bands. NDVI, NDBI, and BSI are displayed only as supporting indicators and do not determine the percentages.",
        source: "Primary classification source",
        supportingSource:
          "Preview and supporting-index source",
        trafficScoreNote:
          "This is an independent context layer. It does not affect the Traffic Score and does not represent vehicle counts.",
      },

      assistant: {
        kicker: "Result explanation",
        title: "AI Assistant",
        description:
          "Ask about the score, traffic, roads and services, or the satellite image. The assistant answers from the current location data without changing the calculation.",
        suggestionsLabel: "Suggested questions",
        questions: {
          why_score:
            "Why did the location receive this score?",
          strongest_factor:
            "What is the strongest factor?",
          weakest_factor:
            "What is the weakest factor?",
          suitability:
            "Is the location suitable for advertising?",
          satellite_context:
            "What does the satellite image show about this location?",
          improve:
            "How can assessment accuracy be improved?",
        },
        customLabel: "Write your question",
        placeholder:
          "Example: How did current congestion affect the result?",
        send: "Send question",
        loading: "Interpreting the result…",
        yourQuestion: "Your question",
        answerLabel: "Assistant explanation",
        aiSource:
          "The explanation was generated by the optional Ollama model.",
        localSource:
          "The explanation was generated locally from the current analysis result.",
        error:
          "The explanation could not be generated. The analysis result was not affected.",
        retry: "Try again",
        disclaimer:
          "This is a simplified estimate based only on the data displayed for this location. It is not business advice or an official vehicle count.",
      },

      report: {
        projectName:
          "Advertising Location Intelligence Platform",
        title:
          "Advertising Location Analysis Report",
        generated: "Report generated",
        pageNumber:
          "Page {{page}} of {{total}}",
        footer:
          "Automated report based on the current analysis result",
        level: "Activity classification",
        locationDetails:
          "Location and analysis area",
        satelliteTitle:
          "Satellite location context",
        satelliteMethodology:
          "Percentages are mean Dynamic World probability-band values within the location radius at 10-meter scale. Trees, grass, flooded vegetation, crops, and shrub and scrub are combined as vegetation; NDVI, NDBI, and BSI are supporting indicators only. This layer does not affect the Traffic Score.",
        satelliteEstimated:
          "Mean land-cover class probabilities within the analysis radius",
        finalSummary: "Final summary",
        assistantExplanation:
          "Explanation of the score",
        methodology: "Methodology",
        methodologyText:
          "The analysis combines OpenStreetMap road-network and nearby-service context with TomTom live traffic conditions, then displays the Traffic Score, factor scores, and weights returned by the backend. The daily activity chart is a visual estimate derived from the current result, not an observed time-series vehicle count.",
        disclaimerTitle: "Important notice",
        factorNote:
          "The list shows each factor score out of 100 and its actual weight in the result without recalculating the score.",
        factorValues:
          "Score: {{score}} out of 100 • Weight: {{weight}}",
        defaultExplanation:
          "The location scored {{score}} out of 100. “{{strongest}}” was the strongest factor at {{strongestScore}}, while “{{weakest}}” was the weakest at {{weakestScore}}. This explanation describes the current result only.",
        defaultExplanationUnavailable:
          "There are not enough factor scores to explain the result in detail.",
        download: "Download PDF Report",
        generating: "Generating report…",
        success:
          "The report was generated and downloaded.",
        error:
          "The PDF report could not be generated. Please try again.",
        retry: "Try again",
      },

      services: {
        title: "Nearby services breakdown",
        summary:
          "{{count}} services found within a {{radius}}-meter radius",
        empty:
          "The source did not return detailed service categories for this location.",
        categories: {
          restaurant: "Restaurants",
          cafe: "Cafés",
          fast_food: "Fast food",
          pharmacy: "Pharmacies",
          hospital: "Hospitals",
          clinic: "Clinics",
          doctors: "Medical centers",
          dentist: "Dental clinics",
          school: "Schools",
          kindergarten: "Kindergartens",
          college: "Colleges",
          university: "Universities",
          mosque: "Mosques",
          place_of_worship: "Places of worship",
          bank: "Banks",
          atm: "ATMs",
          fuel: "Fuel stations",
          parking: "Parking",
          parking_space: "Parking spaces",
          marketplace: "Marketplaces",
          supermarket: "Supermarkets",
          convenience: "Convenience stores",
          bakery: "Bakeries",
          mall: "Shopping centers",
          clothes: "Clothing stores",
          hotel: "Hotels",
          guest_house: "Guest houses",
          attraction: "Tourist attractions",
          cinema: "Cinemas",
          theatre: "Theatres",
          travel_agency: "Travel agencies",
          car_repair: "Car repair shops",
          car_wash: "Car washes",
          childcare: "Childcare centers",
          dry_cleaning: "Dry cleaners",
          laundry: "Laundries",
          electronics: "Electronics stores",
          mobile_phone: "Mobile phone stores",
          furniture: "Furniture stores",
          hardware: "Hardware stores",
          books: "Bookshops",
          stationery: "Stationery stores",
          beauty: "Beauty salons",
          hairdresser: "Hair salons",
          optician: "Opticians",
          veterinary: "Veterinary clinics",
          post_office: "Post offices",
          police: "Police stations",
          fire_station: "Fire stations",
          library: "Libraries",
          community_centre: "Community centers",
          fitness_centre: "Fitness centers",
          sports_centre: "Sports centers",
          swimming_pool: "Swimming pools",
          playground: "Playgrounds",
          bus_station: "Bus stations",
          taxi: "Taxi stands",
          charging_station: "Vehicle charging stations",
          theme_park: "Theme parks",
          museum: "Museums",
          viewpoint: "Viewpoints",
        },
      },

      coordinates: {
        title: "Enter coordinates",
        description:
          "Enter latitude and longitude to select the location directly.",
        or: "Or enter coordinates manually",
        latitude: "Latitude",
        longitude: "Longitude",
        useCoordinates: "Use coordinates",
        invalid:
          "Enter a valid latitude from -90 to 90 and longitude from -180 to 180.",
      },

      compare: {
        eyebrow: "Location comparison",
        title: "Compare Two Locations on the Map",
        description:
          "Select two real map points, then analyze them in parallel to compare Traffic Score and spatial context.",
        mapTitle: "Select both locations",
        mapLabel:
          "Map for selecting two comparison locations",
        selectingLocation:
          "Currently selecting Location {{location}}",
        selectionComplete:
          "Selection complete — either point can be replaced",
        locationa: "Location A",
        locationb: "Location B",
        pointSelected: "Point selected",
        selectOnMap: "Click the map now",
        waitingSelection: "Waiting for selection",
        clickMapHint:
          "Select this point directly on the map",
        select: "Select location",
        replace: "Replace point",
        clearPoint: "Clear point",
        submit: "Compare locations",
        analyzing: "Analyzing locations",
        selectBoth:
          "Select both locations to enable comparison.",
        analyzingLocation: "Analyzing location",
        analyzingLocationDescription:
          "Road and traffic data is being retrieved for this point.",
        recommendationTitle:
          "Best location for advertising",
        recommendationA:
          "Location A is recommended",
        recommendationB:
          "Location B is recommended",
        recommendationClose:
          "The locations are closely matched",
        recommendationInsufficient:
          "Not enough data to select a location",
        winnerExplanation:
          "{{location}} shows stronger estimated outdoor advertising potential based on its Traffic Score and the returned location differences.",
        closeExplanation:
          "The difference between the locations is limited, so the current data does not establish a clear advantage.",
        insufficientExplanation:
          "The analyses did not return complete scores for both locations, so a reliable recommendation cannot be made.",
        scoreDifference: "Score difference",
        points: "points",
        strongestReasons: "Strongest supporting reasons",
        estimateNote:
          "This recommendation is an estimate based on the traffic and location context available at analysis time.",
        reasons: {
          score: "Higher Traffic Score",
          density: "Denser surrounding road network",
          services: "More nearby services and facilities",
          congestion:
            "Higher congestion in the current reading",
          intersections:
            "More estimated road intersections",
          roadType:
            "More suitable nearest-road classification",
          signals:
            "More recorded traffic-signal points",
        },
        detailsEyebrow: "Metric comparison",
        detailsTitle: "Both locations side by side",
        metric: "Metric",
        trafficLevel: "Traffic level",
        speedNote:
          "Speeds are descriptive metrics. A higher current speed is not treated as an advertising advantage by itself.",
      },

      levels: {
        very_high: "Very high traffic activity",
        high: "High traffic activity",
        moderate: "Moderate traffic activity",
        low: "Low traffic activity",
        unknown: "Traffic level unavailable",
      },

      roadTypes: sharedRoadTypesEnglish,

      errors: {
        title: "The analysis could not be completed",
        partialTitle:
          "The analysis completed with available data only",
        osm_unavailable:
          "Road and service data could not be retrieved from OpenStreetMap, so no score was calculated.",
        traffic_unavailable:
          "Live traffic could not be retrieved from TomTom, so no score was calculated.",
        network:
          "The platform could not connect to the analysis service. Make sure it is running, then try again.",
        timeout:
          "Retrieving the data took longer than expected. Please try again shortly.",
        general:
          "An error occurred while analyzing the location. Please try again shortly.",
        retry: "Try Again",
      },
    },
  },
};


function updateDocumentLanguage(language) {
  const isArabic =
    language.startsWith("ar");

  document.documentElement.lang =
    isArabic ? "ar" : "en";
  document.documentElement.dir =
    isArabic ? "rtl" : "ltr";
  document.title = isArabic
    ? "منصة ذكاء المواقع الإعلانية"
    : "Advertising Location Intelligence Platform";
}


i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });


updateDocumentLanguage(savedLanguage);


i18n.on(
  "languageChanged",
  (language) => {
    localStorage.setItem(
      "advertising-location-intelligence-language",
      language,
    );

    updateDocumentLanguage(language);
  },
);


export default i18n;
