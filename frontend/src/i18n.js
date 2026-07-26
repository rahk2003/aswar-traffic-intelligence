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
        liveContext: "سياق مروري مباشر",
        featuresEyebrow: "ذكاء المواقع الإعلانية",
        featuresTitle:
          "المؤشرات الأهم في شاشة تحليل واحدة",
        featuresDescription:
          "من اختيار النقطة إلى تفسير النتيجة، تعرض المنصة بيانات المكان كما تصل من مصادرها الفعلية دون قيم تجريبية.",
        features: {
          live: {
            title: "سياق مروري مباشر",
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
        methodEyebrow: "منهجية التحليل",
        methodTitle: "ثلاث طبقات، وقراءة واحدة",
        methodDescription:
          "تجمع المنصة بين السياق المكاني والحالة المرورية ثم تعرضهما ضمن درجة موحّدة من الخادم.",
        methodOsm: "شبكة الطرق والخدمات",
        methodTomtom: "حالة المرور الحالية",
        methodScore: "نتيجة من 100",
        ctaEyebrow: "ابدأ من موقع فعلي",
        ctaTitle:
          "اختر نقطة على الخريطة واكتشف سياقها المروري والمكاني.",
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
        title: "قارن فرصتين إعلانيتين على الخريطة",
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
        liveContext: "Live traffic context",
        featuresEyebrow: "Advertising location intelligence",
        featuresTitle:
          "The signals that matter, in one analytical view",
        featuresDescription:
          "From selecting a point to interpreting the result, the platform displays data returned by its real sources without demo values.",
        features: {
          live: {
            title: "Real-time traffic context",
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
        methodEyebrow: "Analysis methodology",
        methodTitle: "Three layers, one clear reading",
        methodDescription:
          "The platform combines spatial context and live traffic, then presents the score calculated by the backend.",
        methodOsm: "Roads and nearby services",
        methodTomtom: "Current traffic conditions",
        methodScore: "A result out of 100",
        ctaEyebrow: "Start with a real location",
        ctaTitle:
          "Choose a point on the map and understand its traffic and spatial context.",
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
        title: "Compare Two Advertising Opportunities",
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
