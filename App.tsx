import React, { useState, useRef, useEffect } from 'react';
import { Helmet, HelmetProvider } from 'react-native-helmet-async';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, TextInput, Image, Platform, ActivityIndicator, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';

// --- ייבוא מותנה של react-native-maps — אינו נתמך בווב/Vercel ---
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
}


// --- מסד נתונים של בתי חולים בארץ (GPS + כתובת) ---
const HOSPITALS_DATABASE = [
  { name: "רמב\"ם", city: "חיפה", address: "עיר הקריה ללא מחלקה 8, חיפה", lat: 32.8333, lon: 34.9833 },
  { name: "איכילוב (סוראסקי)", city: "תל אביב", address: "וייצמן 6, תל אביב", lat: 32.0806, lon: 34.7892 },
  { name: "שיבא (תל השומר)", city: "רמת גן", address: "דרך השלום, רמת גן", lat: 32.0461, lon: 34.8433 },
  { name: "סורוקה", city: "באר שבע", address: "רגר 151, באר שבע", lat: 31.2589, lon: 34.7978 },
  { name: "הדסה עין כרם", city: "ירושלים", address: "בית הכרם, ירושלים", lat: 31.7649, lon: 35.1488 },
  { name: "שערי צדק", city: "ירושלים", address: "שמאי 12, ירושלים", lat: 31.7698, lon: 35.1802 },
  { name: "בילינסון (רבין)", city: "פתח תקווה", address: "ז'בוטינסקי 39, פתח תקווה", lat: 32.0897, lon: 34.8661 },
  { name: "מאיר", city: "כפר סבא", address: "טשרניחובסקי 59, כפר סבא", lat: 32.1818, lon: 34.8967 },
  { name: "שמיר (אסף הרופא)", city: "צריפין", address: "צריפין, באר יעקב", lat: 31.9683, lon: 34.8378 },
  { name: "קפלן", city: "רחובות", address: "קפלן 1, רחובות", lat: 31.8814, lon: 34.8211 },
  { name: "ברזילי", city: "אשקלון", address: "הסתדרות הציונית 2, אשקלון", lat: 31.6583, lon: 34.5606 },
  { name: "זיו", city: "צפת", address: "הנשיא 1, צפת", lat: 32.9616, lon: 35.5034 },
  { name: "לניאדו", city: "נתניה", address: "וייצמן 1, נתניה", lat: 32.3422, lon: 34.8519 },
  { name: "הלל יפה", city: "חדרה", address: "הלל יפה 1, חדרה", lat: 32.4411, lon: 34.9002 },
  { name: "פוריה (צפון)", city: "טבריה", address: "כביש 90, טבריה", lat: 32.7444, lon: 35.5261 },
  { name: "המרכז הרפואי לגליל", city: "נהריה", address: "גליל 2, נהריה", lat: 33.0033, lon: 35.1056 },
  { name: "יוספטל", city: "אילת", address: "יוספטל 1, אילת", lat: 29.5606, lon: 34.9431 },
  { name: "וולפסון", city: "חולון", address: "קרל נטר 62, חולון", lat: 32.0356, lon: 34.7608 },
  { name: "העמק", city: "עפולה", address: "יצחק רבין 21, עפולה", lat: 32.6074, lon: 35.3038 },
  { name: "הדסה הר הצופים", city: "ירושלים", address: "הר הצופים, ירושלים", lat: 31.7934, lon: 35.2426 },
  { name: "מעיני הישועה", city: "בני ברק", address: "דבורת הנביאה 3, בני ברק", lat: 32.0889, lon: 34.8331 },
  { name: "אסותא אשדוד", city: "אשדוד", address: "ז'בוטינסקי 7, אשדוד", lat: 31.8044, lon: 34.6553 },
  { name: "גלילי (נהריה)", city: "נהריה", address: "קרלנו 27, נהריה", lat: 33.0175, lon: 35.0976 },
];

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- מסד נתונים של תרופות (מורחב) ---
const DRUG_DATABASE = [
  // כאבים וחום
  { brand: "אקמול, דקסמול, פאראמול, פנדול", generic: "Paracetamol", category: "כאבים וחום", info: "שיכוך כאבים קלים עד בינוניים והורדת חום. מינון מקסימלי: 4g/יום. סכנה להרעלת כבד בנטילת יתר." },
  { brand: "אופטלגין (Optalgin)", generic: "Dipyrone / Metamizole", category: "כאבים וחום", info: "משכך כאבים חזק ומוריד חום. זהירות: רגישות ואגרנולוציטוזיס." },
  { brand: "אדוויל, נורופן, איבופן, דולורס", generic: "Ibuprofen", category: "נוגדי דלקת (NSAIDs)", info: "שיכוך כאב ודלקת. עלול לגרום לגירוי בקיבה, פגיעה כלייתית ועלייה ב-BP." },
  { brand: "וולטרן, דיקלו, דיקלורן", generic: "Diclofenac", category: "נוגדי דלקת (NSAIDs)", info: "NSAID חזק לכאבים מפרקיים ואורתופדיים. גירוי קיבה ופגיעה כלייתית." },
  { brand: "ארקוקסיה, סלקוקס", generic: "Cox-2 Inhibitors (Etoricoxib / Celecoxib)", category: "נוגדי דלקת", info: "לכאבים אורתופדיים חזקים ודלקות פרקים. סיכון קרדיווסקולרי." },
  { brand: "טרמדול, טרמבסיה", generic: "Tramadol", category: "אופיואידים חלשים", info: "משכך כאב חצי-נרקוטי. סכנה לפרכוסים בסף נמוך ואינטראקציות עם SSRI." },
  { brand: "טרגין (Targin), פרקוסט (Percocet), אוקסינורם", generic: "Oxycodone", category: "אופיואידים", info: "משכך כאב נרקוטי חזק. דיכוי נשימה במינון יתר. Naloxone כנגד-תרופה." },
  { brand: "מורפין, MST, אבינזה", generic: "Morphine", category: "אופיואידים", info: "אופיואיד חזק לכאב עוצמתי. דיכוי נשימה, ברדיקרדיה, היפוטנסיה." },
  { brand: "פנטניל, מטדון", generic: "Fentanyl / Methadone", category: "אופיואידים", info: "אופיואידים עוצמתיים. פנטניל: תחילת פעולה מהירה. מטדון: חצי-חיים ארוך — סכנת מינון יתר מאוחר." },
  // נוגדי טסיות ודם
  { brand: "מיקרופירין, קרטיה, אספירין 100/300", generic: "Aspirin (Acetylsalicylic Acid)", category: "נוגדי טסיות", info: "מדלל דם קל, מניעת MI ושבץ. 300mg ללעיסה ב-ACS חריף. מוריד חום (להימנע בילדים)." },
  { brand: "פלביקס", generic: "Clopidogrel", category: "נוגדי טסיות", info: "חוסם ADP לטסיות. לאחר אוטם לב ו-stent. לוקח עד שעה להשפיע." },
  { brand: "ברילינטה", generic: "Ticagrelor", category: "נוגדי טסיות", info: "אנטגוניסט ADP חזק. דיספנאה כתופעת לוואי שכיחה. לא לגרוש בניתוח." },
  { brand: "אליקוויס", generic: "Apixaban", category: "נוגדי קרישה (NOAC)", info: "NOAC — חוסם FXa. מינון מקובל 5mg פעמיים ביום. סכנת דימום!" },
  { brand: "קסרלטו", generic: "Rivaroxaban", category: "נוגדי קרישה (NOAC)", info: "NOAC — חוסם FXa. פעם ביום. אין להפסיק פתאום! סכנת דימום." },
  { brand: "פרדקסה", generic: "Dabigatran", category: "נוגדי קרישה (NOAC)", info: "NOAC — חוסם תרומבין. נגד-תרופה: Idarucizumab (פרקסביינד). סכנת דימום!" },
  { brand: "קומדין (Coumadin), וורפרין", generic: "Warfarin", category: "נוגדי קרישה", info: "מדלל דם ותיק. דורש מעקב INR קבוע (טווח 2-3 לרוב). נגד-תרופה: ויטמין K + FFP." },
  // לחץ דם וקרדיולוגיה
  { brand: "נורמיטן, קונקור, דרלין, ביסופרולול", generic: "Beta Blockers (Metoprolol / Bisoprolol)", category: "חוסמי בטא", info: "מוריד דופק ולחץ דם. חשוב: מסך טכיקרדיה בהלם! אסור להפסיק פתאום." },
  { brand: "אינדרל", generic: "Propranolol", category: "חוסמי בטא לא-סלקטיביים", info: "חוסם בטא לא-סלקטיבי. מסוכן באסתמה וב-COPD. מסך היפוגליקמיה." },
  { brand: "רמיפריל, טריטייס, אנלפריל, קובנטיל", generic: "ACE Inhibitors (Ramipril / Enalapril)", category: "מעכבי ACE", info: "טיפול ביתר לחץ דם ואי ספיקת לב. תופעת לוואי: שיעול יבש. היפרקלמיה." },
  { brand: "לוזרטן, ולסרטן, אירבסרטן", generic: "ARB (Angiotensin Receptor Blockers)", category: "מעכבי ARB", info: "כמו ACE inhibitors ללא שיעול. בשילוב עם ACE — סכנת כשל כלייתי." },
  { brand: "נורווסק, אמלור", generic: "Amlodipine", category: "חוסמי סידן", info: "CCB לטיפול בלחץ דם גבוה. בצקות ברגליים כתופעת לוואי שכיחה." },
  { brand: "אדלת, ניפדיפין", generic: "Nifedipine", category: "חוסמי סידן", info: "CCB לכלי דם. ירידה מהירה בלחץ דם. גלגולית SL מסוכנת." },
  { brand: "איזוסופטין, וראפאמיל", generic: "Verapamil", category: "חוסמי סידן", info: "CCB לדופק וקצב לב. אסור בשילוב עם חוסמי בטא! ברדיקרדיה/בלוק AV." },
  { brand: "קורדרון", generic: "Amiodarone", category: "נגד הפרעות קצב", info: "אנטי-אריתמי עוצמתי ל-AF, VT, VF. פגיעת בלוטת תריס, ריאות, כבד בשימוש ממושך." },
  { brand: "לנוקסין, דיגוקסין", generic: "Digoxin", category: "גליקוזידים קרדיאליים", info: "מאט דופק ב-AF ומחזק התכווצות הלב. טווח טיפולי צר — רעילות: בחילה, הפרעות קצב." },
  { brand: "איזוקט (Isoket), קורדיל, ניטרוגליצרין", generic: "Nitrates", category: "ניטרטים", info: "מרחיב כלי דם. זהירות: נפילת לחץ דם קיצונית. אסור עם ויאגרה (PDE5 inhibitors)!" },
  // משתנים
  { brand: "לסיקס, פורוסמיד", generic: "Furosemide", category: "משתנים (לולאה)", info: "משתן עוצמתי לבצקת ריאות ואי ספיקת לב. היפוקלמיה, היפוטנסיה, ריאות." },
  { brand: "היגרוטון, HCT, הידרוכלורותיאזיד", generic: "Hydrochlorothiazide", category: "משתנים (תיאזיד)", info: "משתן לחץ דם. היפוקלמיה, היפרגליקמיה." },
  { brand: "אלדקטון, ספירונולקטון", generic: "Spironolactone", category: "משתנים (חוסמי אלדוסטרון)", info: "משתן שחוסך אשלגן. היפרקלמיה — זהירות בשילוב עם ACE/ARB." },
  // סוכרת
  { brand: "מטפורמין, גלוקומין, גלוקופאג", generic: "Metformin", category: "סוכרת (ביגואנידים)", info: "מורידה תנגודת לאינסולין. אסור בכשל כלייתי ולפני הרדמה עם חומר ניגוד." },
  { brand: "ג'ארדיאנס", generic: "Empagliflozin (SGLT2i)", category: "סוכרת (SGLT2)", info: "מוריד סוכר, משקל ולחץ דם. DKA (גם ב-normal glucose). UTI שכיח." },
  { brand: "ג'נוביה, ג'נוביה-מט", generic: "Sitagliptin (DPP-4i)", category: "סוכרת (DPP-4)", info: "מוריד סוכר מתון. בטוח יחסית. דלקת לבלב נדירה." },
  { brand: "אוזמפיק, ויקטוזה, ריבלסוס", generic: "GLP-1 Agonists (Semaglutide / Liraglutide)", category: "סוכרת / השמנה", info: "מוריד סוכר ומשקל. בחילות שכיחות. פנקריאטיטיס נדיר. ריפאמין עלייה בדופק." },
  { brand: "לנטוס, טוג'יאו, בסגלאר", generic: "Insulin Glargine (Long-acting)", category: "סוכרת — אינסולין", info: "אינסולין ארוך-טווח פעם ביום. סכנה להיפוגליקמיה." },
  { brand: "נובורפיד, נובולוג, אפידרה, הומלוג", generic: "Insulin Analogs (Rapid-acting)", category: "סוכרת — אינסולין", info: "אינסולין מהיר לפני ארוחות. תחילת פעולה כ-15 דק'. היפוגליקמיה!" },
  // נשימה
  { brand: "ונטולין, סלבוטמול, בריקלין", generic: "Salbutamol (SABA)", category: "נשימה — ברונכודילטטורים", info: "פותח דרכי אוויר מהיר (2-4 משאפות). גורם לטכיקרדיה ורעד. אסתמה וCOPD." },
  { brand: "אירוטרופ, אטרוונט", generic: "Ipratropium (SAMA)", category: "נשימה — ברונכודילטטורים", info: "ברונכודילטטור אנטיכולינרגי. משלים סלבוטמול ב-COPD. יובש בפה." },
  { brand: "ספיריבה, ברי-אלת", generic: "Tiotropium (LAMA)", category: "נשימה — COPD", info: "ברונכודילטטור ארוך-טווח לCOPD. פעם ביום. לא לאסתמה חריפה." },
  { brand: "פוסטר, סימביקורט, סרטייד", generic: "ICS/LABA Combinations", category: "נשימה — אסתמה/COPD", info: "קורטיקוסטרואיד נשאף + ברונכודילטטור ארוך. לטיפול ממושך ומניעתי." },
  // אנטיביוטיקה
  { brand: "אמוקסיצילין, מוקסיפן, פלמוקסין", generic: "Amoxicillin", category: "אנטיביוטיקה (פניצילין)", info: "אנטיביוטיקה רחבה טווח לדרכי נשימה, אוזן ושתן. אלרגיה לפניצילין — שים לב!" },
  { brand: "אוגמנטין", generic: "Amoxicillin-Clavulanate", category: "אנטיביוטיקה (פניצילין+BLI)", info: "פרופיל רחב יותר. גירוי קיבה שכיח. אלרגיה לפניצילין — שים לב!" },
  { brand: "ציפרוצין, ציפרו", generic: "Ciprofloxacin", category: "אנטיביוטיקה (קינולונים)", info: "דרכי שתן, זיהומי עור ומעיים. פגיעה בגידים (אכיליס). אינטראקציה עם אנטיצידים." },
  { brand: "זיתרומקס, אזיתרומיצין", generic: "Azithromycin", category: "אנטיביוטיקה (מקרולידים)", info: "נשימה, ע\"ג. שלב קצר (3-5 ימים). הארכת QT — זהירות בהפרעות קצב." },
  // בלוטת תריס
  { brand: "אלטרוקסין, לבוטרוקסין", generic: "Levothyroxine (T4)", category: "הורמוני תריס", info: "טיפול בתת-פעילות תריס. רגיש מאוד — מינון יתר: טכיקרדיה, חרדה, AF." },
  // ניורולוגיה ונפשיאטריה
  { brand: "ציפרלקס, לוסטרל, פרוזק, פלוקסטין", generic: "SSRI (Escitalopram / Sertraline / Fluoxetine)", category: "נוגדי דיכאון/חרדה", info: "טיפול כרוני בדיכאון וחרדה. תסמונת סרוטונין בשילוב עם טרמדול/MAOIs. לוקח 2-4 שבועות לפעולה." },
  { brand: "ג'יין, סימבלטה", generic: "SNRI (Venlafaxine / Duloxetine)", category: "נוגדי דיכאון/חרדה", info: "עולה ב-BP. דיכאון, חרדה וכאב נוירופתי." },
  { brand: "וליום, אסיבל, קלונקס", generic: "Benzodiazepines (Diazepam / Clonazepam)", category: "הרגעה ושינה", info: "הרגעה, מניעת פרכוסים, הרדמה. תלות! דיכוי נשימה במינון יתר." },
  { brand: "דורמיקום, מידזולם", generic: "Midazolam", category: "הרגעה/הרדמה", info: "בנזודיאזפין קצר-טווח להרדמה ופרכוסים. דיכוי נשימה — מוניטורינג חובה." },
  { brand: "נוירונטין", generic: "Gabapentin", category: "נוגד פרכוסים / כאב נוירופתי", info: "כאב נוירופתי, אפילפסיה. סחרחורת ונמנום. גמילה עלולה לגרום לפרכוסים." },
  { brand: "ליריקה", generic: "Pregabalin", category: "נוגד פרכוסים / כאב נוירופתי", info: "כמו גאבפנטין אך עם השפעה מהירה יותר. פוטנציאל לתלות." },
  { brand: "סרוקוול", generic: "Quetiapine", category: "פסיכיאטריה", info: "סכיזופרניה, דיכאון, BI-Polar. נמנום, עלייה במשקל, עלייה ב-QTc. תת-לחץ דם אורתוסטטי." },
  { brand: "זיפרקסה", generic: "Olanzapine", category: "פסיכיאטריה", info: "אנטי-פסיכוטי. עלייה מהירה במשקל, תנגודת לאינסולין. תת-לחץ אורתוסטטי." },
  { brand: "ריספרדל, ריספרידון", generic: "Risperidone", category: "פסיכיאטריה", info: "אנטי-פסיכוטי. תסמינים אקסטרה-פירמידליים. תת-לחץ אורתוסטטי." },
  // מערכת עיכול
  { brand: "אומפרדקס, לוסק, אומז", generic: "Omeprazole (PPI)", category: "מעכבי משאבת פרוטון", info: "מפחית חומציות קיבה. לנטילת NSAID לאורך זמן. מחסור B12/Mg+ בשימוש כרוני." },
  { brand: "קונטרולוק, פנטופרזול", generic: "Pantoprazole (PPI)", category: "מעכבי משאבת פרוטון", info: "כמו אומפרזול. IV זמין לדימום פעיל עליון." },
  { brand: "זנטק, רניטידין", generic: "Ranitidine / Famotidine (H2 blocker)", category: "חוסמי H2", info: "מפחיתי חומציות חלשים מPPI. זמינים ללא מרשם." },
  // כולסטרול וסטטינים
  { brand: "לבסטטין, ליפיטור", generic: "Atorvastatin", category: "סטטינים", info: "מוריד כולסטרול LDL. כאבי שרירים (מיופתיה) — CK גבוה. אינטראקציה עם מיץ אשכולית." },
  { brand: "קרסטור", generic: "Rosuvastatin", category: "סטטינים", info: "סטטין חזק. נדיר: Rhabdomyolysis. בדיקות כבד." },
  { brand: "זוקור, סימבסטטין", generic: "Simvastatin", category: "סטטינים", info: "סטטין ותיק. אינטראקציות תרופתיות רבות — שים לב!" },
  // שלד ועצמות
  { brand: "פוסלן, פוסמקס, אלנדרונט", generic: "Alendronate (Bisphosphonate)", category: "לעצמות (אוסטיאופורוזיס)", info: "מניעת שברים. חובה לשתות מים ולשבת ישר 30 דק' לאחר נטילה. אזופגיטיס." },
  { brand: "קולכיצין", generic: "Colchicine", category: "שיגדון (Gout)", info: "לכאב חריף שיגדון. מינון יתר קטלני. שלשול שכיח." },
  { brand: "אלופורינול, ציגנים", generic: "Allopurinol", category: "שיגדון (מניעה)", info: "הורדת חומצת שתן לטווח ארוך. לא לנטילה בהתקף חריף." },
  // אחר / מגוון
  { brand: "אומניק (OCAS), האריטמס", generic: "Tamsulosin (Alpha blocker)", category: "ערמונית / שתן", info: "הרפיית ערמונית להפרעות השתנה ב-BPH. תת-לחץ אורתוסטטי — סכנת נפילה!" },
  { brand: "אריספט, מנטלגו", generic: "Donepezil / Rivastigmine", category: "דמנציה / אלצהיימר", info: "מעכבי כולינסטראז לדמנציה. מאט התדרדרות. ברדיקרדיה, בחילה." },
  { brand: "סינמט, מדופר, פרקינסיס", generic: "Levodopa/Carbidopa", category: "פרקינסון", info: "דיסקינזיה, תת-לחץ אורתוסטטי, פסיכוזה. הפסקה פתאומית — NMS מסוכן!" },
  { brand: "דקסמתזון, פרדניזון, מדרול", generic: "Corticosteroids (Systemic)", category: "סטרואידים סיסטמיים", info: "אי ספיקת אדרנל, דלקות, אסתמה. עלייה ב-BP ו-Glucose. לא להפסיק פתאום!" },
];

// --- מסד נתונים של מחלות רקע (מורחב) ---
const DISEASE_DATABASE = [
  // לב וכלי דם
  { medical: "Ischemic Heart Disease (IHD / CAD)", hebrew: "מחלת לב כלילית / איסכמית", info: "היצרות בעורקים הכליליים. סיכון גבוה לתעוקת חזה (אנגינה) או אוטם בשריר הלב (MI). נוטלים לרוב אספירין, סטטין, חוסם בטא." },
  { medical: "Congestive Heart Failure (CHF)", hebrew: "אי ספיקת לב", info: "הלב מתקשה לשאוב דם כראוי. סכנה לבצקת ריאות (קוצר נשימה בשכיבה, חרחורים, SpO₂ ירוד). נוטלים לרוב: לסיקס, ACE/ARB, חוסם בטא." },
  { medical: "Hypertension (HTN)", hebrew: "יתר לחץ דם", info: "לחץ דם גבוה כרוני. גורם סיכון עיקרי ל-MI, CVA ופגיעה כלייתית. משבר יתר לחץ דם (>180/120): נזק איברי מטרה — פינוי דחוף." },
  { medical: "Atrial Fibrillation (A-Fib / AF)", hebrew: "פרפור עליות", info: "הפרעת קצב שכיחה. דופק לא סדיר, ייתכן מהיר. נוטלים מדללי דם (NOAC/וורפרין) — סכנת דימום! AF חדש עם המודינמי לא יציב: cardioversion." },
  { medical: "Ventricular Tachycardia / Fibrillation (VT/VF)", hebrew: "טכיקרדיה חדרית / פרפור חדרים", info: "הפרעות קצב מסכנות חיים. VF = דום לב — יש להחייא מיד. VT עם דופק: הכן דפיברילטור. לרוב ממקור קרדיאלי." },
  { medical: "Aortic Stenosis / Aortic Aneurysm", hebrew: "היצרות מסתם אאורטלי / מפרצת אאורטה", info: "היצרות אאורטה: סינקופה, אנגינה, קוצר נשימה — סיכון גבוה. מפרצת אאורטה (AAA): קרע = הלם מסכן חיים — פינוי נט\"ן!" },
  { medical: "Peripheral Artery Disease (PAD)", hebrew: "מחלת עורקים היקפית", info: "היצרות כלי דם לגפיים. כאב בשריר בהליכה (claudication). ABPI נמוך. פינוי דחוף בכאב חמור אקוטי (חסימה חריפה)." },
  // נשימה
  { medical: "Chronic Obstructive Pulmonary Disease (COPD)", hebrew: "מחלת ריאות חסימתית כרונית", info: "לרוב מעשנים. קוצר נשימה כרוני. SpO₂ בסיסי נמוך (88-92%) — יעד חמצון מתון! החמרה חריפה: ברונכודילטטורים, סטרואידים, חמצן מבוקר." },
  { medical: "Asthma", hebrew: "אסתמה / קצרת", info: "דלקת דרכי נשימה. התקפים בחשיפה לגורמים. צפצופים, קוצר נשימה, שימוש שרירי עזר. ונטולין (Salbutamol) + סטרואידים בהתקף." },
  { medical: "Pulmonary Embolism (PE)", hebrew: "תסחיף ריאתי", info: "חסימת עורק ריאה. קוצר נשימה פתאומי, טכיקרדיה, כאב חזה, SpO₂ ירוד. סכנה להלם ודום לב. אנטיקואגולציה מיידית + פינוי נט\"ן." },
  { medical: "Pneumothorax (Tension)", hebrew: "פנאומותורקס מתח", info: "אוויר לחץ בחלל פלאורה. ירידה בנשימה צד אחד, הסטת טרכיאה, עלייה בלחץ ורידי, הלם — נקב מחט דחוף (עצם 2 ICS, MCL)!" },
  // סוכרת ואנדוקרינולוגיה
  { medical: "Diabetes Mellitus Type 1 / Type 2 (DM)", hebrew: "סוכרת סוג 1 / סוג 2", info: "הפרעת סוכר. היפוגליקמיה (<70): בלבול, הזעה, פרכוס — גלוקוז IV/פומי דחוף. היפרגליקמיה (DKA/HHS): נשימה קוסמאול, התייבשות, בחינת הכרה." },
  { medical: "Hypothyroidism / Hyperthyroidism", hebrew: "תת-פעילות / יתר-פעילות בלוטת תריס", info: "תת-פעילות: עייפות, ברדיקרדיה, היפותרמיה — Myxedema coma נדיר. יתר-פעילות: טכיקרדיה, AF, סערת תריס (thyroid storm) — מסכנת חיים!" },
  { medical: "Adrenal Insufficiency / Addison's", hebrew: "אי-ספיקת אדרנל", info: "חסר קורטיזול. משבר אדרנל: היפוטנסיה, היפונתרמיה, היפוגליקמיה — הידרוקורטיזון IV + נוזלים דחוף!" },
  // כליות ושתן
  { medical: "Chronic Kidney Disease (CKD) / ESRD", hebrew: "אי ספיקת כליות כרונית / דיאליזה", info: "פגיעה בתפקוד כלייתי. היפרקלמיה (>6.5) — סכנת הפרעות קצב! עמוס בנוזלים, אנמיה, יל\"ד. בדיאליזה: תשאול לגבי עיתוי טיפול אחרון." },
  { medical: "Acute Kidney Injury (AKI)", hebrew: "אי ספיקת כליות חריפה", info: "עלייה חדה בקריאטינין. סיבות: prerenal (התייבשות), renal (נפריטיס), postrenal (חסימה). נוזלים IV בזהירות. הימנע מ-NSAIDs וחומר ניגוד." },
  // נוירולוגיה
  { medical: "Cerebrovascular Accident (CVA) / TIA", hebrew: "שבץ מוחי / אירוע מוחי חולף", info: "פגיעה בדם למוח (חסימתי/דימומי). FAST+: פנים, יד, דיבור, ראייה, זמן. זמן = מוח! אל תיתן אספירין לפני CT! מדוד סוכר." },
  { medical: "Epilepsy / Status Epilepticus", hebrew: "אפילפסיה / סטטוס אפילפטיקוס", info: "פרכוס >5 דק' = status epilepticus. מידזולם IM/IV. סיבות: הפסקת תרופה, היפוגליקמיה, אלקטרוליטים, פגיעת ראש. הגן על ראש, חמצן." },
  { medical: "Parkinson's Disease", hebrew: "מחלת פרקינסון", info: "רעד, נוקשות, תנועה איטית. נוטלים L-DOPA (סינמט/מדופר). הפסקת תרופה — NMS מסכן חיים! נטיה גבוהה לנפילות ולבלע לקוי." },
  { medical: "Dementia / Alzheimer's Disease", hebrew: "דמנציה / אלצהיימר", info: "ירידה קוגניטיבית מתקדמת. לרוב קשיי תקשורת. חשש לשימוש שגוי בתרופות. נוטים לנפילות, הגנה על דרכי אוויר." },
  { medical: "Multiple Sclerosis (MS)", hebrew: "טרשת נפוצה", info: "מחלה דמיאלינית. חולשת גפיים, בעיות ראייה, קשיי קואורדינציה. סימן Lhermitte (שוק בכיפוף צוואר). נוטלים תרופות ממוקנות ביולוגיה." },
  // פסיכיאטריה
  { medical: "Major Depressive Disorder / Anxiety", hebrew: "דיכאון מז'ורי / הפרעת חרדה", info: "דיכאון: אובדנות — הערכת סיכון! חרדה: התקפי פאניקה — נשימה, הרגעה. תרופות: SSRI, SNRI, בנזודיאזפינים. תסמונת סרוטונין בשילוב." },
  { medical: "Bipolar Disorder", hebrew: "הפרעה דו-קוטבית", info: "מניה ודיכאון לסירוגין. בטיפול: ליתיום, ולפרואט, אנטי-פסיכוטי. ליתיום: טווח צר — רעילות: רעד, בלבול, שלשול." },
  { medical: "Schizophrenia / Psychosis", hebrew: "סכיזופרניה / פסיכוזה", info: "הפרעה פסיכוטית. נוטלים אנטי-פסיכוטי (ריספרדל, זיפרקסה, קלופיקסול). NMS: חום גבוה, נוקשות, שינוי הכרה — חירום!" },
  // דם ואונקולוגיה
  { medical: "Cancer / Oncology Patient", hebrew: "מחלה ממארת / מטופל אונקולוגי", info: "חשיפה לסיכוני PE, זיהומים (נויטרופניה), דימומים (טרומבוציטופניה). כאב סרטני חמור. כימותרפיה — תופעות לוואי כבדות. פינוי לאונקולוגיה." },
  { medical: "Anemia (Significant)", hebrew: "אנמיה משמעותית", info: "Hb נמוך. עייפות, קוצר נשימה, טכיקרדיה, תת-לחץ. אנמיה חמורה (<7): שקול עירוי. חשוב לברר סיבה: דימום, המוליזה, מחסור." },
  { medical: "DVT / Thrombophilia", hebrew: "פקקת ורידים עמוקה / נטיה לקרישה", info: "כאב ונפיחות ברגל. סכנה לתסחיף ריאתי (PE). נוטלים אנטיקואגולנטים — סכנת דימום. Homan's sign לא אמין." },
  // עיכול ובטן
  { medical: "Liver Cirrhosis / Chronic Liver Disease", hebrew: "שחמת כבד / מחלת כבד כרונית", info: "קרישה לקויה (PT מוארך) — סכנת דימום! ורידים דליתיים — דימום עליון מסכן חיים. אנצפלופתיה כבדית: בלבול + אמוניה גבוהה." },
  { medical: "Inflammatory Bowel Disease (IBD — Crohn's / UC)", hebrew: "מחלת קרוהן / קוליטיס כיבית", info: "מחלות דלקתיות כרוניות של המעי. החמרות: כאבי בטן, שלשולים, דמם מרקטום, חום. נוטלים: סטרואידים, ביולוגיה, 5-ASA." },
  // מפרקים ועצמות
  { medical: "Rheumatoid Arthritis (RA)", hebrew: "דלקת מפרקים שגרונתית", info: "מחלה דלקתית אוטואימונית. נוטלים מדכאי חיסון — סיכון זיהומים גבוה! NSAIDs, סטרואידים, מתוטרקסט, ביולוגיה." },
  { medical: "Systemic Lupus (SLE)", hebrew: "זאבת אדמנתית מערכתית", info: "מחלה אוטואימונית רב-מערכתית. פרפח פנים, פגיעת כליות, לב, מוח. מדכאי חיסון — נטייה לזיהומים." },
  { medical: "Gout (Gouty Arthritis)", hebrew: "שיגדון", info: "שקיעת קריסטלי חומצת שתן במפרקים. כאב חריף, אדמומיות ונפיחות (אגודל כף הרגל לרוב). קולכיצין/NSAIDs לטיפול חריף." },
  { medical: "Osteoporosis", hebrew: "אוסטיאופורוזיס", info: "ירידה בצפיפות עצם. נטייה גבוהה לשברים (ירך, חוליות, שורש כף יד). שברי עמוד שדרה: כאב גב — חשוב לאמר קיבוע!" },
  // אחר
  { medical: "Organ Transplant / Immunosuppressed", hebrew: "השתלת איבר / מדוכא חיסוני", info: "נוטלים מדכאי חיסון. סיכון גבוה לזיהומים אופורטוניסטיים (PCP, CMV). חשד לזיהום — פינוי דחוף. הימנע מ-NSAIDs." },
  { medical: "HIV / AIDS", hebrew: "נגיף ה-HIV / איידס", info: "ספירת CD4 נמוכה — סיכון לזיהומים הזדמנותיים. נוטלים תרופות אנטירטרוויראליות. אינטראקציות תרופתיות רבות." },
  { medical: "Obstructive Sleep Apnea (OSA)", hebrew: "דום נשימה בשינה", info: "הפסקות נשימה בשינה. לרוב עם CPAP. השמנה גורם סיכון מרכזי. הרדמה — שים לב לסיכון דרכי נשימה!" },
  { medical: "Obesity / Metabolic Syndrome", hebrew: "השמנת יתר / תסמונת מטבולית", info: "BMI>30. גורם סיכון ל-DM2, HTN, IHD, OSA, מפרקים. גישה לוריד עשויה להיות קשה. שים לב לתרופות שבהן מינון תלוי משקל." },
  { medical: "Alcohol / Substance Use Disorder", hebrew: "שימוש מזיק באלכוהול / סמים", info: "גמילה מאלכוהול: Delirium Tremens — פרכוסים, חרדה, אוטונומי — מסכן חיים! הרעלה: ABCDE + נוגדנים ספציפיים (נלוקסון לאופיואידים)." },
];

// --- מסד מתורגמן רפואי לשטח ---
const TRANSLATIONS = [
  { he: "שלום, אנחנו צוות רפואי. באנו לעזור לך.", en: "Hello, we are medical staff. We are here to help you.", ru: "Здравствуйте, мы медицинский персонал. Мы здесь, чтобы помочь вам.", ar: "مرحباً، نحن طاقم طبي. نحن هنا لمساعدتك.", am: "ሰላም፣ እኛ የህክምና ባለሙያዎች ነን። ልንረዳዎ መጥተናል።" },
  { he: "איפה כואב לך? תצביע עם היד.", en: "Where does it hurt? Point with your hand.", ru: "Где у вас болит? Покажите рукой.", ar: "أين يؤلمك؟ أشر بيدك.", am: "የት ነው የሚያምህ? በእጅህ አሳይ።" },
  { he: "האם קשה לך לנשום?", en: "Is it difficult for you to breathe?", ru: "Вам трудно дышать?", ar: "هل تجد صعوبة في التنفس؟", am: "ለመተንፈስ ይከብደዎታል?" },
  { he: "האם אתה אלרגי לתרופות כלשהן?", en: "Are you allergic to any medications?", ru: "У вас есть аллергия на какие-либо лекарства?", ar: "هل لديك حساسية تجاه أي أدوية؟", am: "ለማንኛውም መድሃኒት አለርጂ ነዎት?" },
  { he: "האם לקחת תרופות היום?", en: "Did you take any medications today?", ru: "Вы принимали сегодня какие-нибудь лекарства?", ar: "هل تناولت أي أدوية اليوم؟", am: "ዛሬ ምንም ዓይነት መድሃኒት ወስደዋል?" },
  { he: "האם אכלת או שתית משהו בשעות האחרונות?", en: "Did you eat or drink anything in the last few hours?", ru: "Вы ели или пили что-нибудь за последние несколько часов?", ar: "هل أكلت أو شربت أي شيء في الساعات القليلة الماضية؟", am: "ባለፉት ጥቂት ሰዓታት ውስጥ ምንም በልተዋል ወይም ጠጥተዋል?" },
  { he: "תנשום עמוק ולאט.", en: "Take a deep, slow breath.", ru: "Сделайте глубокий, медленный вдох.", ar: "خذ نفساً عميقاً وبطيئاً.", am: "ጥልቅ እና ቀስ ያለ ትንፋሽ ይውሰዱ።" },
  { he: "אל תזוז, אנחנו צריכים לקבע אותך.", en: "Do not move, we need to secure you.", ru: "Не двигайтесь, нам нужно зафиксировать вас.", ar: "لا تتحرك، نحتاج إلى تثبيتك.", am: "አትንቀሳቀስ፣ እኛ አንተን ማረጋጋት አለብን።" }
];

// --- מסך מתורגמן רפואי ---
const TranslatorScreen = () => {
  const [selectedLang, setSelectedLang] = useState('en');
  const [activePhrase, setActivePhrase] = useState(null);
  const [activePhraseIndex, setActivePhraseIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<'phrases' | 'free'>('phrases');
  const [freeText, setFreeText] = useState('');
  const [freeResult, setFreeResult] = useState('');
  const [translating, setTranslating] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'am', name: 'አማርኛ', flag: '🇪🇹' }
  ];

  const langNames: Record<string, string> = { en: 'English', ru: 'Russian', ar: 'Arabic', am: 'Amharic' };

  const playAudio = (phraseObj: any, idx?: number) => {
    setActivePhrase(phraseObj);
    if (idx !== undefined) setActivePhraseIndex(idx);
    Speech.stop();
    if (selectedLang !== 'am') {
      Speech.speak(phraseObj[selectedLang], { language: selectedLang });
    }
  };

  const closePhrase = () => {
    setActivePhrase(null);
    setActivePhraseIndex(null);
    Speech.stop();
  };

  const goNext = () => {
    if (activePhraseIndex === null) return;
    const next = (activePhraseIndex + 1) % TRANSLATIONS.length;
    playAudio(TRANSLATIONS[next], next);
  };

  const goPrev = () => {
    if (activePhraseIndex === null) return;
    const prev = (activePhraseIndex - 1 + TRANSLATIONS.length) % TRANSLATIONS.length;
    playAudio(TRANSLATIONS[prev], prev);
  };

  const translateFree = async () => {
    if (!freeText.trim()) return;
    setTranslating(true);
    setFreeResult('');
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_KEY || '';
      if (!apiKey) { setFreeResult('❌ מפתח API חסר'); setTranslating(false); return; }
      const targetLang = langNames[selectedLang];
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are a medical translator. Translate the following Hebrew medical question/phrase to ${targetLang}. Return ONLY the translation, no explanation.\n\nHebrew: ${freeText}` }] }],
          safetySettings: [
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
          ]
        })
      });
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        setFreeResult(text.trim());
        if (selectedLang !== 'am') Speech.speak(text.trim(), { language: selectedLang });
      } else {
        setFreeResult('❌ שגיאה בתרגום. בדוק חיבור לאינטרנט.');
      }
    } catch (e: any) { setFreeResult(`❌ שגיאת רשת: ${e.message}`); }
    setTranslating(false);
  };

  return (
    <View style={styles.internalScreen}>
      <Text style={styles.internalTitle}>מתורגמן רפואי לשטח</Text>

      {/* בחירת שפה */}
      <View style={[styles.rowReverse, {marginBottom: 12}]}>
        {languages.map(lang => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.miniOption, {width: '23%'}, selectedLang === lang.code && styles.selectedOption]}
            onPress={() => { setSelectedLang(lang.code); setActivePhrase(null); setFreeResult(''); Speech.stop(); }}
          >
            <Text style={{textAlign: 'center', fontSize: 24}}>{lang.flag}</Text>
            <Text style={[styles.optionText, {textAlign: 'center', fontSize: 12, marginTop: 5}, selectedLang === lang.code && styles.selectedOptionText]}>{lang.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* בחירת מצב */}
      <View style={[styles.rowReverse, {marginBottom: 16, gap: 8}]}>
        <TouchableOpacity style={[styles.modeTab, mode === 'phrases' && styles.modeTabActive]} onPress={() => setMode('phrases')}>
          <Text style={[styles.modeTabText, mode === 'phrases' && styles.modeTabTextActive]}>📋 משפטים מוכנים</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeTab, mode === 'free' && styles.modeTabActive]} onPress={() => setMode('free')}>
          <Text style={[styles.modeTabText, mode === 'free' && styles.modeTabTextActive]}>✏️ תרגום חופשי</Text>
        </TouchableOpacity>
      </View>

      {/* מצב משפטים מוכנים */}
      {mode === 'phrases' && (
        <>
          {activePhrase && (
            <View style={styles.summaryCard}>
              {/* כפתור סגירה + ניווט */}
              <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                <TouchableOpacity onPress={goPrev} style={styles.navArrowBtn}><Text style={styles.navArrowText}>◀ הקודם</Text></TouchableOpacity>
                <TouchableOpacity onPress={closePhrase} style={styles.closePhraseBtn}><Text style={styles.closePhraseBtnText}>✕ סגור</Text></TouchableOpacity>
                <TouchableOpacity onPress={goNext} style={styles.navArrowBtn}><Text style={styles.navArrowText}>הבא ▶</Text></TouchableOpacity>
              </View>
              <Text style={{color: '#888', fontSize: 15, marginBottom: 8, textAlign: 'center'}}>{activePhrase.he}</Text>
              <Text style={{color: '#FF8C00', fontSize: selectedLang === 'am' ? 28 : 24, fontWeight: 'bold', textAlign: 'center', lineHeight: 38}}>{activePhrase[selectedLang]}</Text>
              {selectedLang === 'am' ? (
                <Text style={{color: '#ff4444', textAlign: 'center', marginTop: 12, fontWeight: 'bold', fontSize: 13}}>* הקראה קולית באמהרית אינה נתמכת. הצג למטופל.</Text>
              ) : (
                <TouchableOpacity style={[styles.scanBtn, {marginTop: 16, padding: 10, backgroundColor: '#333'}]} onPress={() => playAudio(activePhrase)}>
                  <Text style={[styles.scanBtnText, {color: '#fff'}]}>🔊 השמע שוב</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <ScrollView showsVerticalScrollIndicator={false}>
            {TRANSLATIONS.map((item, index) => (
              <TouchableOpacity key={index} style={[styles.phraseBtn, activePhraseIndex === index && {borderColor: '#FF8C00'}]} onPress={() => playAudio(item, index)}>
                <Text style={styles.phraseBtnText}>{item.he}</Text>
                <Text style={{fontSize: 20}}>🗣️</Text>
              </TouchableOpacity>
            ))}
            <View style={{height: 100}}/>
          </ScrollView>
        </>
      )}

      {/* מצב תרגום חופשי */}
      {mode === 'free' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={{color: '#888', textAlign: 'right', fontSize: 13, marginBottom: 8}}>הקלד שאלה או משפט בעברית — המערכת תתרגם לשפה שבחרת</Text>
          <TextInput
            style={[styles.searchInput, {height: 90, textAlignVertical: 'top', textAlign: 'right', paddingTop: 10}]}
            placeholder="לדוגמה: האם יש לך כאב בחזה?"
            placeholderTextColor="#666"
            value={freeText}
            onChangeText={setFreeText}
            multiline
          />
          <TouchableOpacity style={[styles.scanBtn, {marginTop: 12}, translating && {backgroundColor: '#555'}]} onPress={translateFree} disabled={translating}>
            {translating ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.scanBtnIcon}>🌐</Text>}
            <Text style={styles.scanBtnText}>{translating ? ' מתרגם...' : ` תרגם ל-${langNames[selectedLang]}`}</Text>
          </TouchableOpacity>
          {freeResult !== '' && (
            <View style={styles.summaryCard}>
              <Text style={{color: '#888', fontSize: 13, marginBottom: 6, textAlign: 'center'}}>תרגום:</Text>
              <Text style={{color: '#FF8C00', fontSize: 24, fontWeight: 'bold', textAlign: 'center', lineHeight: 36}}>{freeResult}</Text>
              {selectedLang !== 'am' && (
                <TouchableOpacity style={[styles.scanBtn, {marginTop: 14, padding: 10, backgroundColor: '#333'}]} onPress={() => Speech.speak(freeResult, { language: selectedLang })}>
                  <Text style={[styles.scanBtnText, {color: '#fff'}]}>🔊 השמע שוב</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={{height: 100}}/>
        </ScrollView>
      )}
    </View>
  );
};

// --- מסד פרוטוקולים מבצעיים ---
const PROTOCOLS_DATABASE = [
  {
    id: 'cpr', icon: '💔', title: 'החייאת מבוגר (דום לב)',
    steps: [
      { text: "האם המטופל בהכרה? (מגיב לקול או לכאב?)", type: "question", options: [{ label: "כן", next: 1 }, { label: "לא", next: 2 }] },
      { text: "המטופל בהכרה. אין צורך בהחייאה. המשך סכימת טיפול (ABCDE).", type: "end" },
      { text: "בדוק נשימה ודופק קרוטיד (10 שניות). האם יש דופק ונשימה?", type: "question", options: [{ label: "יש", next: 3 }, { label: "אין", next: 4 }] },
      { text: "שמור על נתיב אוויר פתוח, תמוך נשימתית, ספק חמצן והכן לפינוי דחוף.", type: "end" },
      { text: "🚨 דום לב! התחל עיסויים (30:2) מיד וחבר דפיברילטור (AED). האם המכשיר ממליץ על מכת חשמל?", type: "question", options: [{ label: "כן (VF/pVT)", next: 5 }, { label: "לא (Asystole/PEA)", next: 6 }] },
      { text: "⚡ תן שוק! -> מיד לאחר מכן חזור ל-2 דקות עיסויים ברצף. שקול מתן אדרנלין 1mg לאחר השוק השני.", type: "end", alert: true },
      { text: "⚠️ אל תתן שוק! -> חזור מיד ל-2 דקות עיסויים. הזרק אדרנלין 1mg בהקדם האפשרי וחפש סיבות הפיכות.", type: "end" }
    ]
  },
  {
    id: 'cva', icon: '🧠', title: 'חשד לשבץ מוחי (CVA)',
    steps: [
      { text: "בצע בדיקת FAST (צניחת פנים, חולשת יד, דיבור משובש). האם יש סימנים חיוביים?", type: "question", options: [{ label: "כן", next: 1 }, { label: "לא", next: 2 }] },
      { text: "בדוק רמת סוכר בדם (גלוקומטר). האם הסוכר מתחת ל-60 mg/dL?", type: "question", options: [{ label: "כן", next: 3 }, { label: "לא", next: 4 }] },
      { text: "המשך סכימת טיפול (ABCDE). שקול סיבות אחרות למצב.", type: "end" },
      { text: "⚠️ חשד להיפוגליקמיה שדמתה לשבץ. תן גלוקוז ובדוק שוב.", type: "end" },
      { text: "🚨 חשד גבוה לשבץ מוחי! הודע למוקד, ציין שעת התחלת סימנים, פנה דחוף לבי\"ח עם יחידת שבץ. אל תתן אספירין!", type: "end", alert: true }
    ]
  },
  {
    id: 'stemi', icon: '🫀', title: 'כאבים בחזה (חשד ל-STEMI)',
    steps: [
      { text: "האם יש למטופל כאב אופייני בחזה המלווה בקוצר נשימה או זיעה קרה?", type: "question", options: [{ label: "כן", next: 1 }, { label: "לא", next: 2 }] },
      { text: "בצע אק\"ג 12 לידים (או סורק AI). האם יש עליות ST?", type: "question", options: [{ label: "כן", next: 3 }, { label: "לא", next: 4 }] },
      { text: "המשך בירור. שקול כאב ממקור אחר.", type: "end" },
      { text: "🚨 אוטם חריף (STEMI)!\n1. הושב והרגע את המטופל.\n2. חמצן אם סטורציה < 94%.\n3. תן אספירין בלעיסה (300mg).\n4. פינוי דחוף לחדר צנתורים.", type: "end", alert: true },
      { text: "⚠️ חשד לתעוקת חזה. תן אספירין 300mg בלעיסה, שקול מתן חנקות אם ל\"ד מעל 100 סיסטולי.", type: "end" }
    ]
  },
  {
    id: 'allergy', icon: '🐝', title: 'אנפילקסיס (אלרגיה חריפה)',
    steps: [
      { text: "האם יש למטופל קושי נשימתי (צפצופים, סטרידור) או סימני הלם (נפילת ל\"ד, טכיקרדיה)?", type: "question", options: [{ label: "כן", next: 1 }, { label: "לא", next: 2 }] },
      { text: "🚨 סכנת חיים מיידית! הזרק אפיפן (אדרנלין) 0.3mg לירך. הרם את רגלי המטופל וספק חמצן. פינוי נט\"ן דחוף.", type: "end", alert: true },
      { text: "האם יש פריחה מפושטת וגירוד בלבד ללא קשיי נשימה?", type: "question", options: [{ label: "כן", next: 3 }, { label: "לא", next: 4 }] },
      { text: "⚠️ תגובה אלרגית בינונית. תן השגחה רצופה. מוכנות להתדרדרות והזרקת אפיפן.", type: "end" },
      { text: "המשך סכימת טיפול וחפש סיבות אחרות.", type: "end" }
    ]
  }
];

// --- מסך מפת בתי חולים והכוונה לפינוי ---
const HospitalsMapScreen = () => {
  const [location, setLocation] = useState(null);
  const [closestHospital, setClosestHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLoading(false); return; }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      let minDistance = Infinity; let closest = null;
      HOSPITALS_DATABASE.forEach(hospital => {
        const dist = getDistanceFromLatLonInKm(loc.coords.latitude, loc.coords.longitude, hospital.lat, hospital.lon);
        if (dist < minDistance) { minDistance = dist; closest = { ...hospital, distance: dist }; }
      });
      setClosestHospital(closest); setLoading(false);
    })();
  }, []);

  if (loading) return (<View style={[styles.internalScreen, {justifyContent: 'center'}]}><ActivityIndicator size="large" color="#FF8C00" /><Text style={{color: '#fff', textAlign: 'center', marginTop: 10}}>מאתר מיקום ומחשב טווחי פינוי...</Text></View>);
  if (!location) return (<View style={styles.internalScreen}><Text style={styles.internalTitle}>מפת בתי חולים</Text><Text style={{color: '#ff4444', textAlign: 'center', fontSize: 18}}>אין גישה למיקום (GPS).</Text></View>);

  const openWaze = (hospital) => {
    const url = `https://waze.com/ul?ll=${hospital.lat},${hospital.lon}&navigate=yes&zoom=17`;
    Linking.openURL(url);
  };

  // גרסת ווב: MapView אינו נתמך — רשימת בתי חולים עם המלצת פינוי
  if (Platform.OS === 'web') {
    return (
      <View style={styles.internalScreen}>
        <Text style={styles.internalTitle}>מפת בתי חולים</Text>
        {closestHospital && (
          <View style={styles.evacBanner}>
            <Text style={styles.evacBannerTitle}>🚨 המלצת פינוי: הבית החולים הקרוב ביותר</Text>
            <Text style={styles.evacBannerName}>{closestHospital.name} ({closestHospital.city})</Text>
            <Text style={styles.evacBannerDistance}>מרחק אווירי: {closestHospital.distance.toFixed(1)} ק"מ</Text>
            <TouchableOpacity style={styles.wazeBtn} onPress={() => openWaze(closestHospital)}>
              <Text style={styles.wazeBtnText}>🔵 נווט ב-Waze</Text>
            </TouchableOpacity>
          </View>
        )}
        <ScrollView showsVerticalScrollIndicator={false}>
          {HOSPITALS_DATABASE.map((h, i) => {
            const isClosest = closestHospital && closestHospital.name === h.name;
            return (
              <View key={i} style={[styles.diseaseCard, isClosest && {borderRightColor: '#FF8C00', borderRightWidth: 3}]}>
                <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <View style={{flex: 1}}>
                    <Text style={[styles.diseaseMedical, isClosest && {color: '#FF8C00'}]}>{isClosest ? '⭐ ' : ''}{h.name}</Text>
                    <Text style={styles.diseaseHebrew}>{h.city}</Text>
                    <Text style={{color: '#888', fontSize: 12, textAlign: 'right', marginTop: 3}}>{h.address}</Text>
                  </View>
                  <TouchableOpacity style={[styles.wazeBtn, {marginRight: 0, marginLeft: 8, paddingHorizontal: 10, paddingVertical: 6}]} onPress={() => openWaze(h)}>
                    <Text style={[styles.wazeBtnText, {fontSize: 12}]}>🔵 Waze</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          <View style={{height: 100}} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      {closestHospital && (
        <View style={styles.evacBanner}>
          <Text style={styles.evacBannerTitle}>🚨 המלצת פינוי: הבית חולים הקרוב ביותר</Text>
          <Text style={styles.evacBannerName}>{closestHospital.name} ({closestHospital.city})</Text>
          <Text style={styles.evacBannerDistance}>מרחק אווירי: {closestHospital.distance.toFixed(1)} ק"מ</Text>
          <TouchableOpacity style={styles.wazeBtn} onPress={() => openWaze(closestHospital)}>
            <Text style={styles.wazeBtnText}>🔵 נווט ב-Waze</Text>
          </TouchableOpacity>
        </View>
      )}
      <MapView style={{flex: 1}} showsUserLocation={true} showsMyLocationButton={true} initialRegion={{ latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 }}>
        {HOSPITALS_DATABASE.map((hospital, index) => {
          const isClosest = closestHospital && closestHospital.name === hospital.name;
          return <Marker key={index} coordinate={{ latitude: hospital.lat, longitude: hospital.lon }} title={hospital.name} description={`${hospital.city} ${isClosest ? '(הקרוב ביותר)' : ''}`} pinColor={isClosest ? 'orange' : 'red'} />;
        })}
      </MapView>
    </View>
  );
};

// --- מסך מנוע הפרוטוקולים ---
const ProtocolsScreen = () => {
  const [activeProtocol, setActiveProtocol] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);

  const openProtocol = (protocol) => { setActiveProtocol(protocol); setStepIndex(0); };
  const currentStep = activeProtocol ? activeProtocol.steps[stepIndex] : null;

  if (!activeProtocol) {
    return (
      <View style={styles.internalScreen}>
        <Text style={styles.internalTitle}>פרוטוקולים מבצעיים</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {PROTOCOLS_DATABASE.map((prot, index) => (
            <TouchableOpacity key={index} style={styles.protocolCard} onPress={() => openProtocol(prot)}>
              <Text style={styles.protocolIcon}>{prot.icon}</Text>
              <Text style={styles.protocolTitle}>{prot.title}</Text>
            </TouchableOpacity>
          ))}
          <View style={{height: 100}} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.internalScreen}>
      <Text style={[styles.internalTitle, {fontSize: 20}]}>{activeProtocol.icon} {activeProtocol.title}</Text>
      <View style={[styles.resultContainer, currentStep.alert && {borderColor: '#ff4444', borderWidth: 2}]}>
        {currentStep.alert && <Text style={{color: '#ff4444', fontSize: 24, textAlign: 'center', marginBottom: 10, fontWeight: 'bold'}}>סכנת חיים!</Text>}
        <Text style={[styles.internalSubTitle, {fontSize: 20, lineHeight: 30, textAlign: 'center'}]}>{currentStep.text}</Text>
        {currentStep.type === 'question' && (
          <View style={[styles.rowReverse, {marginTop: 20}]}>
            {currentStep.options.map((opt, i) => (
              <TouchableOpacity key={i} style={[styles.scanBtn, {flex: 1, marginHorizontal: 5, backgroundColor: i === 0 ? '#ff4444' : '#44aaff'}]} onPress={() => setStepIndex(opt.next)}>
                <Text style={styles.scanBtnText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {currentStep.type === 'end' && (
          <TouchableOpacity style={[styles.scanBtn, {marginTop: 40, backgroundColor: '#333'}]} onPress={() => setActiveProtocol(null)}>
            <Text style={[styles.scanBtnText, {color: '#fff'}]}>סיום / חזרה לרשימה</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// --- מסך מודל החייאה (CPR) ---
const CPRScreen = () => {
  const [isActive, setIsActive] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [shockTime, setShockTime] = useState(0);
  const [medTime, setMedTime] = useState(0);
  const [beat, setBeat] = useState(false);
  const [sound, setSound] = useState(null);

  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true, shouldDuckAndroid: true });
        const { sound: s } = await Audio.Sound.createAsync({ uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' });
        setSound(s);
      } catch (error) { console.log(error); }
    }
    setupAudio();
    return () => { if (sound) sound.unloadAsync(); };
  }, []);

  useEffect(() => {
    let interval = null;
    let metronome = null;
    if (isActive) {
      interval = setInterval(() => { setTotalTime(t => t + 1); setShockTime(s => s + 1); setMedTime(m => m + 1); }, 1000);
      metronome = setInterval(async () => {
        setBeat(b => !b);
        if (sound) { try { await sound.replayAsync(); } catch (e) { } }
      }, 600);
    } else {
      clearInterval(interval); clearInterval(metronome);
    }
    return () => { clearInterval(interval); clearInterval(metronome); };
  }, [isActive, sound]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const resetAll = () => { setIsActive(false); setTotalTime(0); setShockTime(0); setMedTime(0); setBeat(false); };

  return (
    <View style={styles.internalScreen}>
      <Text style={styles.internalTitle}>מנהל החייאה (CPR)</Text>
      <View style={[styles.summaryCard, {borderColor: isActive ? '#ff4444' : '#FF8C00'}]}>
        <Text style={styles.summaryTitle}>זמן החייאה כולל</Text>
        <Text style={[styles.summaryTotal, {fontSize: 65, color: isActive ? '#ff4444' : '#FF8C00'}]}>{formatTime(totalTime)}</Text>
      </View>
      <View style={styles.rowReverse}>
        <TouchableOpacity style={[styles.cprMainBtn, {backgroundColor: isActive ? '#330000' : '#003300', borderColor: isActive ? '#ff4444' : '#44ff44'}]} onPress={() => setIsActive(!isActive)}>
          <Text style={[styles.cprMainBtnText, {color: isActive ? '#ff4444' : '#44ff44'}]}>{isActive ? 'השהה החייאה' : 'התחל עיסויים'}</Text>
        </TouchableOpacity>
        <View style={styles.metronomeContainer}>
          <View style={[styles.metronomeCircle, {backgroundColor: beat && isActive ? '#ff4444' : '#1C1C1E'}]} />
          <Text style={styles.metronomeText}>קצב 100 🔊</Text>
        </View>
      </View>
      <View style={[styles.cprTimerCard, shockTime >= 120 && styles.cprTimerAlert]}>
        <View style={{flex: 1}}>
          <Text style={styles.cprTimerTitle}>הערכת קצב / שוק</Text>
          <Text style={styles.cprTimerValue}>{formatTime(shockTime)} <Text style={{fontSize: 14}}>/ 02:00</Text></Text>
        </View>
        <TouchableOpacity style={styles.cprResetBtn} onPress={() => setShockTime(0)}><Text style={styles.cprResetBtnText}>איפס</Text></TouchableOpacity>
      </View>
      <View style={[styles.cprTimerCard, medTime >= 240 && styles.cprTimerAlert]}>
        <View style={{flex: 1}}>
          <Text style={styles.cprTimerTitle}>אדרנלין (1mg)</Text>
          <Text style={styles.cprTimerValue}>{formatTime(medTime)} <Text style={{fontSize: 14}}>/ 04:00</Text></Text>
        </View>
        <TouchableOpacity style={styles.cprResetBtn} onPress={() => setMedTime(0)}><Text style={styles.cprResetBtnText}>ניתן תרופה</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.cprStopBtn} onPress={resetAll}><Text style={styles.cprStopBtnText}>סיום אירוע / איפוס הכל</Text></TouchableOpacity>
    </View>
  );
};

// --- מסך סורק אק"ג AI ---
const ECGScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const cameraRef = useRef(null);

  if (!permission) return <View style={styles.internalScreen}><ActivityIndicator color="#FF8C00" /></View>;
  if (!permission.granted) {
    return (
      <View style={styles.internalScreen}>
        <Text style={styles.internalTitle}>סורק אק"ג AI</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={requestPermission}><Text style={styles.scanBtnText}>אשר גישה למצלמה</Text></TouchableOpacity>
      </View>
    );
  }

  const performScan = async () => {
    if (!cameraRef.current) return;
    setScanning(true); setResult(null);
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_KEY || '';
      if (!apiKey) {
        setResult('❌ מפתח API חסר! הגדר EXPO_PUBLIC_GEMINI_KEY בהגדרות Vercel.');
        setScanning(false); return;
      }
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      const cleanBase64 = photo.base64.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: "אתה קרדיולוג מומחה. נתח את תרשים האק\"ג המצורף. ציין קצב, מהירות, והאם יש עדות ל-STEMI או הפרעות קצב. ענה בעברית מקצועית." },
            { inline_data: { mime_type: "image/jpeg", data: cleanBase64 } }
          ]}],
          safetySettings: [
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH",        threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT",         threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",  threshold: "BLOCK_NONE" }
          ]
        })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        setResult(data.candidates[0].content.parts[0].text);
      } else if (data.error) {
        const errMsg = data.error?.message || JSON.stringify(data.error);
        const isExpired = errMsg.toLowerCase().includes('expired');
        const isInvalid = errMsg.toLowerCase().includes('api key not valid') || errMsg.toLowerCase().includes('invalid');
        const hint = isExpired ? '\n\n⚠️ המפתח פג תוקף — צור מפתח חדש ב-Google AI Studio ועדכן ב-Vercel.' : isInvalid ? '\n\n⚠️ המפתח לא תקין — בדוק את הגדרות Vercel.' : '';
        setResult(`❌ שגיאה (HTTP ${response.status}):\n${errMsg}${hint}\n\nמפתח: ${apiKey.substring(0, 8)}...`);
      } else {
        setResult(`⚠️ תשובה לא צפויה (HTTP ${response.status}):\n${JSON.stringify(data)}`);
      }
    } catch (e) { setResult(`❌ תקלת רשת:\n${e.message}`); }
    finally { setScanning(false); }
  };

  return (
    <View style={styles.internalScreen}>
      <Text style={styles.internalTitle}>סורק אק"ג AI</Text>
      {!result ? (
        <>
          <View style={styles.cameraContainer}>
            <CameraView style={{flex: 1}} facing="back" ref={cameraRef}>
              <View style={styles.cameraOverlay}><View style={styles.targetBox} /><Text style={styles.cameraHelpText}>הצב את הסטריפ במסגרת</Text></View>
            </CameraView>
          </View>
          <TouchableOpacity style={[styles.scanBtn, scanning && {backgroundColor: '#555'}]} onPress={performScan} disabled={scanning}>
            {scanning ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.scanBtnIcon}>📷</Text>}
            <Text style={styles.scanBtnText}>{scanning ? ' סורק ומנתח...' : ' סרוק תרשים'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.resultTitle}>תוצאה:</Text>
          <Text style={[styles.resultText, {fontSize: 16, textAlign: 'left'}]}>{result}</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={() => setResult(null)}><Text style={styles.scanBtnText}>🔄 סריקה חדשה</Text></TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

// --- מחשבון GCS ---
const GCSCalculator = () => {
  const [eyes, setEyes] = useState(0); const [verbal, setVerbal] = useState(0); const [motor, setMotor] = useState(0);
  const total = eyes + verbal + motor;
  const getStatus = (score) => { if (score === 0) return "בחר נתונים"; if (score <= 8) return "פגיעת ראש קשה"; if (score <= 12) return "פגיעת ראש בינונית"; return "מצב תקין / פגיעה קלה"; };
  const Option = ({ label, value, selected, onSelect }) => (
    <TouchableOpacity style={[styles.option, selected && styles.selectedOption]} onPress={() => onSelect(value)}><Text style={[styles.optionText, selected && styles.selectedOptionText]}>{label}</Text></TouchableOpacity>
  );
  return (
    <View style={styles.internalScreen}>
      <Text style={styles.internalTitle}>מחשבון GCS (מבוגר)</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>ציון סופי</Text><Text style={styles.summaryTotal}>{total > 0 ? total : '--'}</Text>
            <Text style={{color: '#FF8C00', fontSize: 16, fontWeight: 'bold', marginTop: 5}}>{getStatus(total)}</Text>
        </View>
        <Text style={styles.internalSubTitle}>פתיחת עיניים (Eyes)</Text>
        <Option label="ספונטנית (4)" value={4} selected={eyes===4} onSelect={setEyes} />
        <Option label="לקול (3)" value={3} selected={eyes===3} onSelect={setEyes} />
        <Option label="לכאב (2)" value={2} selected={eyes===2} onSelect={setEyes} />
        <Option label="אין תגובה (1)" value={1} selected={eyes===1} onSelect={setEyes} />
        
        <Text style={styles.internalSubTitle}>תגובה מילולית (Verbal)</Text>
        <Option label="מתמצא / לעניין (5)" value={5} selected={verbal===5} onSelect={setVerbal} />
        <Option label="מבולבל (4)" value={4} selected={verbal===4} onSelect={setVerbal} />
        <Option label="מילים לא לעניין (3)" value={3} selected={verbal===3} onSelect={setVerbal} />
        <Option label="קולות לא מובנים (2)" value={2} selected={verbal===2} onSelect={setVerbal} />
        <Option label="אין תגובה (1)" value={1} selected={verbal===1} onSelect={setVerbal} />
        
        <Text style={styles.internalSubTitle}>תגובה מוטורית (Motor)</Text>
        <Option label="מציית לפקודות (6)" value={6} selected={motor===6} onSelect={setMotor} />
        <Option label="ממקם כאב (5)" value={5} selected={motor===5} onSelect={setMotor} />
        <Option label="נסיגה מכאב (4)" value={4} selected={motor===4} onSelect={setMotor} />
        <Option label="פלקציה אבנורמלית (3)" value={3} selected={motor===3} onSelect={setMotor} />
        <Option label="אקסטנציה (2)" value={2} selected={motor===2} onSelect={setMotor} />
        <Option label="אין תגובה (1)" value={1} selected={motor===1} onSelect={setMotor} />
        <View style={{height: 100}}/>
      </ScrollView>
    </View>
  );
};

// --- מחשבון APGAR ---
const APGARCalculator = () => {
  const [scores, setScores] = useState({ a:-1, p:-1, g:-1, ac:-1, r:-1 });
  const isComplete = Object.values(scores).every(v => v !== -1);
  const total = Object.values(scores).reduce((a, b) => a + (b === -1 ? 0 : b), 0);
  const Option = ({ label, val, cat }) => (
    <TouchableOpacity style={[styles.miniOption, scores[cat]===val && styles.selectedOption]} onPress={() => setScores({...scores, [cat]: val})}><Text style={[styles.optionText, scores[cat]===val && styles.selectedOptionText]}>{label}</Text></TouchableOpacity>
  );
  return (
    <View style={styles.internalScreen}>
      <Text style={styles.internalTitle}>מחשבון APGAR</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>ציון סופי</Text><Text style={styles.summaryTotal}>{isComplete ? total : '--'}</Text>
            <Text style={{color: '#FF8C00', fontSize: 16, fontWeight: 'bold', marginTop: 5}}>{isComplete ? (total>=7 ? "תקין" : total>=4 ? "מצוקה קלה" : "מצוקה קשה - החייאה!") : "השלם בדיקה"}</Text>
        </View>
        <Text style={styles.internalSubTitle}>מראה (Appearance)</Text>
        <View style={styles.rowReverse}>
          <Option label="ורוד (2)" val={2} cat="a"/><Option label="קצוות כחולים (1)" val={1} cat="a"/><Option label="כחול (0)" val={0} cat="a"/>
        </View>
        <Text style={styles.internalSubTitle}>דופק (Pulse)</Text>
        <View style={styles.rowReverse}>
          <Option label="מעל 100 (2)" val={2} cat="p"/><Option label="מתחת 100 (1)" val={1} cat="p"/><Option label="אין (0)" val={0} cat="p"/>
        </View>
        <Text style={styles.internalSubTitle}>גירוי (Grimace)</Text>
        <View style={styles.rowReverse}>
          <Option label="בכי חזק (2)" val={2} cat="g"/><Option label="עווית (1)" val={1} cat="g"/><Option label="אין (0)" val={0} cat="g"/>
        </View>
        <Text style={styles.internalSubTitle}>טונוס (Activity)</Text>
        <View style={styles.rowReverse}>
          <Option label="פעילה (2)" val={2} cat="ac"/><Option label="כיפוף (1)" val={1} cat="ac"/><Option label="רפיון (0)" val={0} cat="ac"/>
        </View>
        <Text style={styles.internalSubTitle}>נשימה (Respiration)</Text>
        <View style={styles.rowReverse}>
          <Option label="בכי חזק (2)" val={2} cat="r"/><Option label="חלשה (1)" val={1} cat="r"/><Option label="אין (0)" val={0} cat="r"/>
        </View>
        <View style={{height: 100}}/>
      </ScrollView>
    </View>
  );
};

// --- מחשבון כוויות ---
const BurnCalculator = () => (
  <View style={styles.internalScreen}>
    <Text style={styles.internalTitle}>מחשבון כוויות</Text>
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.burnAreaRow}><Text style={styles.burnAreaLabel}>ראש וצוואר (9%)</Text><TextInput style={styles.burnAreaInput} placeholder="0" keyboardType="numeric" placeholderTextColor="#666" /></View>
      <View style={styles.burnAreaRow}><Text style={styles.burnAreaLabel}>חזה ובטן (18%)</Text><TextInput style={styles.burnAreaInput} placeholder="0" keyboardType="numeric" placeholderTextColor="#666" /></View>
      <View style={styles.burnAreaRow}><Text style={styles.burnAreaLabel}>גב עליון ותחתון (18%)</Text><TextInput style={styles.burnAreaInput} placeholder="0" keyboardType="numeric" placeholderTextColor="#666" /></View>
      <View style={styles.rowReverse}>
        <View style={[styles.burnAreaRow, {width: '48%'}]}><Text style={styles.burnAreaLabel}>זרוע ימין 9%</Text><TextInput style={styles.burnAreaInput} placeholder="0" keyboardType="numeric" placeholderTextColor="#666" /></View>
        <View style={[styles.burnAreaRow, {width: '48%'}]}><Text style={styles.burnAreaLabel}>זרוע שמאל 9%</Text><TextInput style={styles.burnAreaInput} placeholder="0" keyboardType="numeric" placeholderTextColor="#666" /></View>
      </View>
      <View style={styles.rowReverse}>
        <View style={[styles.burnAreaRow, {width: '48%'}]}><Text style={styles.burnAreaLabel}>רגל ימין 18%</Text><TextInput style={styles.burnAreaInput} placeholder="0" keyboardType="numeric" placeholderTextColor="#666" /></View>
        <View style={[styles.burnAreaRow, {width: '48%'}]}><Text style={styles.burnAreaLabel}>רגל שמאל 18%</Text><TextInput style={styles.burnAreaInput} placeholder="0" keyboardType="numeric" placeholderTextColor="#666" /></View>
      </View>
      <View style={{height: 100}}/>
    </ScrollView>
  </View>
);

// --- מסך תרופות ---
const DrugsScreen = () => {
  const [search, setSearch] = useState('');
  const filtered = DRUG_DATABASE.filter(d => d.brand.includes(search) || d.generic.toLowerCase().includes(search.toLowerCase()));
  return (
    <View style={styles.internalScreen}>
      <Text style={styles.internalTitle}>מילון תרופות</Text>
      <TextInput style={styles.searchInput} placeholder="חפש תרופה..." placeholderTextColor="#666" onChangeText={setSearch} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {filtered.map((d, i) => (
          <View key={i} style={styles.drugCard}><Text style={styles.drugBrand}>{d.brand}</Text><Text style={styles.drugGeneric}>{d.generic} | {d.category}</Text><Text style={styles.drugInfo}>{d.info}</Text></View>
        ))}
        <View style={{height: 100}}/>
      </ScrollView>
    </View>
  );
};

// --- מסך מחלות רקע ---
const DiseasesScreen = () => {
  const [search, setSearch] = useState('');
  const filtered = DISEASE_DATABASE.filter(d => d.medical.toLowerCase().includes(search.toLowerCase()) || d.hebrew.includes(search));
  return (
    <View style={styles.internalScreen}>
      <Text style={styles.internalTitle}>מחלות רקע</Text>
      <TextInput style={styles.searchInput} placeholder="חפש מחלה..." placeholderTextColor="#666" onChangeText={setSearch} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {filtered.map((d, i) => (
          <View key={i} style={styles.diseaseCard}><Text style={styles.diseaseMedical}>{d.medical}</Text><Text style={styles.diseaseHebrew}>{d.hebrew}</Text><Text style={styles.diseaseInfo}>{d.info}</Text></View>
        ))}
        <View style={{height: 100}}/>
      </ScrollView>
    </View>
  );
};

// --- מסך טבלת מדדים ---
const VitalsScreen = () => (
  <View style={styles.internalScreen}>
    <Text style={styles.internalTitle}>טבלת מדדים חיוניים</Text>
    <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderText}>נשימות</Text>
        <Text style={styles.tableHeaderText}>ל"ד סיסטולי</Text>
        <Text style={styles.tableHeaderText}>דופק</Text>
        <Text style={styles.tableHeaderText}>גיל</Text>
    </View>
    <View style={[styles.tableRow, {backgroundColor: 'rgba(255,140,0,0.1)'}]}>
        <Text style={styles.tableCell}>30-60</Text><Text style={styles.tableCell}>60-90</Text><Text style={styles.tableCell}>120-160</Text><Text style={styles.tableCellOrange}>יילוד</Text>
    </View>
    <View style={styles.tableRow}>
        <Text style={styles.tableCell}>24-40</Text><Text style={styles.tableCell}>87-105</Text><Text style={styles.tableCell}>100-120</Text><Text style={styles.tableCell}>תינוק</Text>
    </View>
    <View style={styles.tableRow}>
        <Text style={styles.tableCell}>18-30</Text><Text style={styles.tableCell}>95-110</Text><Text style={styles.tableCell}>80-100</Text><Text style={styles.tableCell}>ילד</Text>
    </View>
    <View style={styles.tableRow}>
        <Text style={styles.tableCell}>12-20</Text><Text style={styles.tableCell}>110-140</Text><Text style={styles.tableCell}>60-100</Text><Text style={styles.tableCellOrange}>מבוגר</Text>
    </View>
  </View>
);

// --- האפליקציה הראשית ---
export default function App() {
  const [activeTab, setActiveTab] = useState('HOME');
  const [locationAddress, setLocationAddress] = useState("לחץ לאיתור מיקום GPS...");
  const [locationCoords, setLocationCoords] = useState<{lat: number, lon: number} | null>(null);
  const [isLoadingLoc, setIsLoadingLoc] = useState(false);


  const fetchLocation = async () => {
    setIsLoadingLoc(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationAddress("❌ הרשאה נדחתה"); setIsLoadingLoc(false); return; }
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setLocationCoords({ lat: latitude, lon: longitude });
      let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode && geocode.length > 0) {
        const p = geocode[0];
        const street = [p.street, p.streetNumber].filter(Boolean).join(' ');
        const city = p.city || p.subregion || '';
        setLocationAddress(`📍 ${street}${street && city ? ', ' : ''}${city}`);
      } else {
        setLocationAddress(`📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
    } catch (e) { setLocationAddress("❌ שגיאה בקליטת GPS"); }
    setIsLoadingLoc(false);
  };

  const shareLocationWhatsApp = () => {
    if (!locationCoords) return;
    const mapsLink = `https://maps.google.com/?q=${locationCoords.lat},${locationCoords.lon}`;
    const message = `🚨 מיקום לחילוץ:\n${locationAddress.replace('📍 ', '')}\n${mapsLink}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const renderScreen = () => {
    switch(activeTab) {
      case 'MAP': return <HospitalsMapScreen />;
      case 'TRANSLATOR': return <TranslatorScreen />;
      case 'ECG': return <ECGScreen />;
      case 'GCS': return <GCSCalculator />;
      case 'APGAR': return <APGARCalculator />;
      case 'BURNS': return <BurnCalculator />;
      case 'VITALS': return <VitalsScreen />;
      case 'MEDS': return <DrugsScreen />;
      case 'DISEASES': return <DiseasesScreen />;
      case 'CPR': return <CPRScreen />;
      case 'PROTOCOLS': return <ProtocolsScreen />;
      default: return null;
    }
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>United Hatzalah</title>
        <link rel="icon" href="https://izud-hatzala-app.vercel.app/logo.png" />
        <meta property="og:title" content="United Hatzalah - העוזר הדיגיטלי לכונן" />
        <meta property="og:description" content="אפליקציית עזר לכונני איחוד הצלה עם סורק אקג AI, מחשבונים קליניים ומאגר תרופות." />
        <meta property="og:image" content="https://izud-hatzala-app.vercel.app/logo.png" />
        <meta property="og:url" content="https://izud-hatzala-app.vercel.app/" />
        <meta property="og:type" content="website" />
      </Helmet>
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => setActiveTab('HOME')} style={styles.headerIcons}><Text style={styles.iconText}>🏠</Text></TouchableOpacity>
        <View style={styles.logoContainer}><Text style={styles.headerTitle}>United Hatzalah</Text><Image source={require('./assets/logo.jpg')} style={styles.logo} /></View>
      </View>

      <View style={styles.contentArea}>
        {renderScreen()}
        {activeTab === 'HOME' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <View style={styles.gpsWidget}>
              <Text style={styles.gpsWidgetTitle}>המיקום שלך לחילוץ / הכוונה:</Text>
              <TouchableOpacity onPress={fetchLocation}>
                {isLoadingLoc ? <ActivityIndicator color="#FF8C00" /> : <Text style={styles.gpsWidgetText}>{locationAddress}</Text>}
              </TouchableOpacity>
              {locationCoords && (
                <TouchableOpacity style={styles.whatsappBtn} onPress={shareLocationWhatsApp}>
                  <Text style={styles.whatsappBtnText}>📲 שתף מיקום בוואטסאפ</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* החזרנו פנימה את הכל! 9 כפתורים, נגלל למטה במידת הצורך */}
            <View style={styles.gridContainer}>
              <TouchableOpacity style={styles.gridItem} onPress={() => setActiveTab('TRANSLATOR')}><Text style={styles.gridIcon}>🌍</Text><Text style={styles.gridText}>מתורגמן</Text></TouchableOpacity>
              <TouchableOpacity style={styles.gridItem} onPress={() => setActiveTab('MAP')}><Text style={styles.gridIcon}>🏥</Text><Text style={styles.gridText}>בתי חולים</Text></TouchableOpacity>
              <TouchableOpacity style={styles.gridItem} onPress={() => setActiveTab('PROTOCOLS')}><Text style={styles.gridIcon}>📋</Text><Text style={styles.gridText}>פרוטוקולים</Text></TouchableOpacity>
              <TouchableOpacity style={styles.gridItem} onPress={() => setActiveTab('ECG')}><Text style={styles.gridIcon}>📈</Text><Text style={styles.gridText}>סורק אק"ג</Text></TouchableOpacity>
              <TouchableOpacity style={styles.gridItem} onPress={() => setActiveTab('MEDS')}><Text style={styles.gridIcon}>💊</Text><Text style={styles.gridText}>תרופות</Text></TouchableOpacity>
              <TouchableOpacity style={styles.gridItem} onPress={() => setActiveTab('DISEASES')}><Text style={styles.gridIcon}>🗂️</Text><Text style={styles.gridText}>מחלות</Text></TouchableOpacity>
              <TouchableOpacity style={styles.gridItem} onPress={() => setActiveTab('VITALS')}><Text style={styles.gridIcon}>❤️</Text><Text style={styles.gridText}>מדדים</Text></TouchableOpacity>
              <TouchableOpacity style={styles.gridItem} onPress={() => setActiveTab('GCS')}><Text style={styles.gridIcon}>🧠</Text><Text style={styles.gridText}>GCS</Text></TouchableOpacity>
              <TouchableOpacity style={styles.gridItem} onPress={() => setActiveTab('APGAR')}><Text style={styles.gridIcon}>👶</Text><Text style={styles.gridText}>APGAR</Text></TouchableOpacity>
            </View>
            
            <Text style={styles.sectionTitle}>כלים מהירים</Text>
            <View style={styles.quickToolsContainer}>
              <TouchableOpacity style={[styles.quickToolBtn, {borderColor: '#ff4444'}]} onPress={() => setActiveTab('BURNS')}><Text style={styles.quickToolIcon}>🔥</Text><Text style={styles.quickToolText}>כוויות</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.quickToolBtn, {borderColor: '#ff0000', backgroundColor: '#330000'}]} onPress={() => setActiveTab('CPR')}><Text style={styles.quickToolIcon}>⚡</Text><Text style={[styles.quickToolText, {color: '#ff4444'}]}>החייאה</Text></TouchableOpacity>
            </View>
            <View style={{height: 100}} />
          </ScrollView>
        )}
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('HOME')}><Text style={[styles.navIcon, activeTab === 'HOME' && styles.navIconActive]}>🏠</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('TRANSLATOR')}><Text style={[styles.navIcon, activeTab === 'TRANSLATOR' && styles.navIconActive]}>🌍</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('MAP')}><Text style={[styles.navIcon, activeTab === 'MAP' && styles.navIconActive]}>🏥</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('PROTOCOLS')}><Text style={[styles.navIcon, activeTab === 'PROTOCOLS' && styles.navIconActive]}>📋</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
    </HelmetProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topHeader: { backgroundColor: '#FF8C00', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#000', marginRight: 10 },
  logo: { width: 35, height: 35, resizeMode: 'contain' },
  headerIcons: { width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 20 },
  contentArea: { flex: 1 },
  scrollContent: { padding: 20 },
  gpsWidget: { backgroundColor: '#1C1C1E', padding: 18, borderRadius: 15, borderWidth: 1, borderColor: '#44aaff', marginBottom: 20, alignItems: 'center' },
  gpsWidgetTitle: { color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  gpsWidgetText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  gridContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '47%', backgroundColor: '#1C1C1E', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  gridIcon: { fontSize: 40, marginBottom: 10 },
  gridText: { color: '#FF8C00', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  sectionTitle: { color: '#FF8C00', fontSize: 15, fontWeight: 'bold', textAlign: 'right', marginVertical: 15 },
  quickToolsContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  quickToolBtn: { backgroundColor: '#1C1C1E', width: '47%', padding: 15, borderRadius: 15, borderWidth: 1, alignItems: 'center', flexDirection: 'row-reverse', justifyContent: 'center' },
  quickToolIcon: { fontSize: 20, marginLeft: 10 },
  quickToolText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#111', flexDirection: 'row-reverse', justifyContent: 'space-around', paddingVertical: 15, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#222' },
  navItem: { alignItems: 'center' },
  navIcon: { fontSize: 24, color: '#555', marginBottom: 4 },
  navIconActive: { color: '#FF8C00' },
  internalScreen: { flex: 1, padding: 20, paddingBottom: 80 },
  internalTitle: { color: '#FF8C00', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  internalSubTitle: { color: '#fff', textAlign: 'right', fontWeight: 'bold', fontSize: 18, marginTop: 15, marginBottom: 20, lineHeight: 28 },
  cameraContainer: { flex: 1, borderRadius: 20, overflow: 'hidden', marginBottom: 20, borderWidth: 2, borderColor: '#444' },
  cameraOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  targetBox: { width: '85%', height: 180, borderWidth: 2, borderColor: '#FF8C00', borderStyle: 'dashed', borderRadius: 10 },
  cameraHelpText: { color: '#fff', marginTop: 15, fontWeight: 'bold' },
  scanBtn: { backgroundColor: '#FF8C00', flexDirection: 'row', padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  scanBtnIcon: { fontSize: 22, marginLeft: 10, color: '#000' },
  scanBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  resultContainer: { flex: 1, backgroundColor: '#1C1C1E', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#333' },
  resultTitle: { color: '#FF8C00', fontSize: 22, fontWeight: 'bold', textAlign: 'right', marginBottom: 15 },
  resultText: { color: '#fff', fontSize: 18, textAlign: 'right', lineHeight: 28, marginBottom: 15 },
  option: { backgroundColor: '#1C1C1E', padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  miniOption: { backgroundColor: '#1C1C1E', padding: 10, borderRadius: 12, width: '31%', borderWidth: 1, borderColor: '#333' },
  selectedOption: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  optionText: { color: '#ccc', textAlign: 'right', fontSize: 14, fontWeight: 'bold' },
  selectedOptionText: { color: '#000', fontWeight: '900' },
  summaryCard: { backgroundColor: '#1C1C1E', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 25, borderWidth: 2, borderColor: '#FF8C00' },
  summaryTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  summaryTotal: { color: '#FF8C00', fontSize: 50, fontWeight: '900' },
  burnAreaRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1C1C1E', padding: 15, borderRadius: 15, marginBottom: 10 },
  burnAreaLabel: { color: '#fff', textAlign: 'right', fontWeight: 'bold', flex: 1 },
  burnAreaInput: { backgroundColor: '#000', color: '#fff', padding: 10, width: 70, textAlign: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#444', fontSize: 16 },
  searchInput: { backgroundColor: '#1C1C1E', color: '#fff', padding: 15, borderRadius: 15, marginBottom: 20, textAlign: 'right', borderWidth: 1, borderColor: '#444', fontSize: 16 },
  drugCard: { backgroundColor: '#1C1C1E', padding: 18, borderRadius: 15, marginBottom: 15, borderRightWidth: 5, borderRightColor: '#FF8C00' },
  drugBrand: { color: '#fff', fontWeight: '900', textAlign: 'right', fontSize: 20 },
  drugGeneric: { color: '#FF8C00', fontSize: 15, textAlign: 'right', marginBottom: 8, fontWeight: 'bold' },
  drugInfo: { color: '#bbb', textAlign: 'right', lineHeight: 22 },
  diseaseCard: { backgroundColor: '#1C1C1E', padding: 18, borderRadius: 15, marginBottom: 15, borderRightWidth: 5, borderRightColor: '#44aaff' },
  diseaseMedical: { color: '#fff', fontWeight: '900', textAlign: 'right', fontSize: 20 },
  diseaseHebrew: { color: '#44aaff', textAlign: 'right', fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  diseaseInfo: { color: '#bbb', textAlign: 'right', lineHeight: 22 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#FF8C00', paddingBottom: 10, marginBottom: 10 },
  tableHeaderText: { flex: 1, color: '#888', textAlign: 'center', fontWeight: 'bold', fontSize: 15 },
  tableRow: { flexDirection: 'row', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#222', alignItems: 'center' },
  tableCell: { flex: 1, color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '500' },
  tableCellOrange: { flex: 1, color: '#FF8C00', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  rowReverse: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  cprMainBtn: { flex: 1, padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginLeft: 10 },
  cprMainBtnText: { fontSize: 22, fontWeight: '900' },
  metronomeContainer: { width: 100, height: 100, backgroundColor: '#1C1C1E', borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#333' },
  metronomeCircle: { width: 50, height: 50, borderRadius: 25, marginBottom: 5 },
  metronomeText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  cprTimerCard: { backgroundColor: '#1C1C1E', borderRadius: 15, padding: 15, flexDirection: 'row-reverse', alignItems: 'center', marginTop: 15, borderWidth: 1, borderColor: '#333' },
  cprTimerAlert: { borderColor: '#ff4444', backgroundColor: 'rgba(255, 0, 0, 0.1)' },
  cprTimerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  cprTimerValue: { color: '#FF8C00', fontSize: 28, fontWeight: '900', textAlign: 'right', marginTop: 5 },
  cprResetBtn: { backgroundColor: '#333', padding: 15, borderRadius: 10 },
  cprResetBtnText: { color: '#fff', fontWeight: 'bold' },
  cprStopBtn: { backgroundColor: '#ff4444', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 30 },
  cprStopBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  protocolCard: { backgroundColor: '#1C1C1E', padding: 20, borderRadius: 15, marginBottom: 15, flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  protocolIcon: { fontSize: 30, marginLeft: 15 },
  protocolTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  evacBanner: { backgroundColor: '#1C1C1E', padding: 20, borderBottomWidth: 3, borderBottomColor: '#FF8C00', alignItems: 'center' },
  evacBannerTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  evacBannerName: { color: '#FF8C00', fontSize: 22, fontWeight: '900' },
  evacBannerDistance: { color: '#888', fontSize: 16, marginTop: 5 },
  phraseBtn: { backgroundColor: '#1C1C1E', padding: 20, borderRadius: 15, marginBottom: 15, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  phraseBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'right', marginRight: 15 },
  whatsappBtn: { marginTop: 12, backgroundColor: '#25D366', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
  whatsappBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  wazeBtn: { marginTop: 10, backgroundColor: '#33CCFF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  wazeBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#444', alignItems: 'center', backgroundColor: '#1C1C1E' },
  modeTabActive: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  modeTabText: { color: '#888', fontWeight: 'bold', fontSize: 13 },
  modeTabTextActive: { color: '#000' },
  navArrowBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#333' },
  navArrowText: { color: '#FF8C00', fontWeight: 'bold', fontSize: 13 },
  closePhraseBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#550000' },
  closePhraseBtnText: { color: '#ff4444', fontWeight: 'bold', fontSize: 13 },
});