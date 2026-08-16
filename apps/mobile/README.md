# InternMatch — React Native

Figma tasarımındaki 18 ekranın tamamının React Native karşılığı. Mevcut bir React Native
projeniz varsa `src/` klasörünü ve `App.js`'i doğrudan projenize kopyalayıp birleştirebilir,
ya da bu klasörü olduğu gibi yeni bir repo/branch olarak kullanabilirsiniz.

## Klasör yapısı

```
internmatch-app/
├── App.js
├── package.json
└── src/
    ├── theme/colors.js          # ortak renk paleti (gradient, teal, status renkleri)
    ├── components/
    │   ├── GradientButton.js    # tüm ekranlardaki CTA butonları
    │   ├── MatchBadge.js        # %94 / %88 / %71 eşleşme rozetleri
    │   └── Chip.js              # Python/ML/SQL gibi skill etiketleri
    ├── services/
    │   └── googleAuth.js        # "by Google" akışı (native Google Sign-In sarmalayıcı)
    ├── navigation/
    │   ├── RootNavigator.js     # tüm ekranları birbirine bağlayan stack
    │   ├── MainTabs.js          # alt sekmeler: Home / Internships / Matchups / Applications / Profile
    │   └── CustomTabBar.js      # Figma'daki ikon barı
    └── screens/                 # 15 ekran dosyası (aşağıdaki eşleştirmeye bakın)
```

## Figma ekranı → dosya eşleştirmesi

| Figma ekranı | Dosya |
|---|---|
| Splash Screen | `screens/SplashScreen.js` |
| Sign In Page | `screens/SignInScreen.js` |
| Sign Up Page | `screens/SignUpScreen.js` |
| Login/Register by Google | `services/googleAuth.js` (native OS akışı, ayrıca bkz. not aşağıda) |
| Home Page (2 durum) | `screens/HomeScreen.js` |
| Internships | `screens/InternshipsScreen.js` |
| Internships Detail | `screens/InternshipDetailScreen.js` |
| Matchups | `screens/MatchupsScreen.js` |
| Why You Match | `screens/WhyYouMatchScreen.js` |
| AI Cover Letter Draft | `screens/CoverLetterDraftScreen.js` |
| Cover Letter | `screens/CoverLetterScreen.js` |
| Applications | `screens/ApplicationsScreen.js` |
| Profile | `screens/ProfileScreen.js` |
| Edit Profile Page | `screens/EditProfileScreen.js` |
| Settings Page | `screens/SettingsScreen.js` |
| CV Upload Page | `screens/CVUploadScreen.js` |

> **Not — Google giriş ekranları:** Figma'daki "wants to use google.com to log in" ve
> "Choose an account" ekranları Google/işletim sistemi tarafından native olarak render edilir;
> uygulama kodu içinde bunları piksel piksel kopyalamak mümkün değildir ve önerilmez.
> Bunun yerine `services/googleAuth.js` içinde `@react-native-google-signin/google-signin`
> paketiyle gerçek OAuth akışı tetiklenir — kullanıcı butona bastığında o native ekranlar
> otomatik olarak açılır.

## Kurulum

```bash
npm install
# iOS
cd ios && pod install && cd ..
npm run ios
# Android
npm run android
```

Ek native kurulum gerektiren paketler:
- `react-native-vector-icons`: font linkleme (bkz. paketin kendi kurulum talimatları)
- `@react-native-google-signin/google-signin`: iOS URL scheme + Android SHA-1 + `webClientId`
- `react-native-linear-gradient`: otomatik link olur, ekstra adım gerekmez (RN ≥0.60)

## Sahte (mock) veriler

Tüm ekranlarda `MOCK_*` sabitleri olarak işaretlenmiş örnek veriler var (örn. `HomeScreen.js`
içindeki `MOCK_MATCHUPS`). Bunları kendi API/servis katmanınıza bağlamanız yeterli — component
yapısı ve prop'lar zaten gerçek veriyle çalışacak şekilde kuruldu.

## Git branch'e push etme

```bash
git checkout -b feature/internmatch-ui
# bu klasördeki dosyaları projenize kopyaladıktan sonra:
git add .
git commit -m "Figma tasarımlarından InternMatch ekranlarının React Native implementasyonu"
git push origin feature/internmatch-ui
```
