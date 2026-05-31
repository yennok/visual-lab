# Visual Lab — Session Handoff

> מסמך זה הוא ה"זיכרון" בין סשנים. קרא אותו בתחילת כל סשן חדש כדי להיכנס לעניינים מהר.
> עדכן אותו בסוף כל סשן (סעיף "Changelog" למטה).

_Last updated: 2026-05-31_

---

## 1. מה זה המוצר (TL;DR)

**Visual Lab** = כלי שמייצר תמונות **on-brand** עקביות למותג.
- **Engine + Concierge**: אותו מנוע משמש גם כשאנחנו מקימים מותג ללקוח (concierge) וגם, בעתיד, כשהלקוח עושה זאת לבד (self-serve).
- **הזרימה המרכזית**: מעלים תמונות reference של מותג → לוחצים **Analyze** → Gemini מחזיר פרופיל ויזואלי (stylePrompt + palette) → כל תמונה חדשה נוצרת לפי אותו stylePrompt כדי לשמור על עקביות.

**הסטטוס כרגע: Phase 1 עובד end-to-end. Analyze נבדק על מותג אמיתי — "עובד מעולה".** ✅

---

## 2. סטטוס נוכחי — מה עובד

- ✅ **Brand Studio v1** — העלאת reference images + ניתוח AI (`/app/brands`)
- ✅ **Analyze** — Gemini מחזיר styleDescription, palette, lighting, mood, composition → נשמר ל-`Brand.stylePrompt` + `Brand.palette`
- ✅ **Generation pipeline** — `/api/generate`: buildBrandPrompt + reference images → Gemini image model → Vercel Blob → שורת `Generation`
- ✅ **Composer + Gallery** ב-`/app`
- ✅ סכמת DB + מיגרציות (כולל עמודת `palette` שתוקנה בסשן זה)

**ענף עבודה**: `claude/pensive-dirac-ZVM13` (committed + pushed, נקי)

---

## 3. מפת הקוד (איפה כל דבר)

```
src/
  app/
    (marketing)/page.tsx          # landing
    onboarding/page.tsx
    sign-in / sign-up             # Clerk auth
    app/                          # ← האפליקציה המוגנת
      layout.tsx
      page.tsx                    # Workspace: Composer + Gallery of generations
      _components/composer.tsx    # טופס יצירת תמונה (scene → /api/generate)
      brands/
        page.tsx                  # Brand Studio: references + Analyze + palette
        actions.ts                # server actions: saveBrand, analyzeBrand ⭐
        brand-form.tsx
        reference-uploader.tsx    # העלאה ל-/api/blob/upload
        palette.tsx               # תצוגת ה-swatches
    api/
      generate/route.ts           # ⭐ pipeline יצירת התמונה
      blob/upload/route.ts        # העלאת reference ל-Vercel Blob
  lib/
    brand-analysis.ts             # ⭐ analyzeBrandImages + composeStylePrompt + normalizePalette
    brand-prompt.ts               # buildBrandPrompt(stylePrompt, subjects, scene)
    gemini.ts                     # generateImage() — קורא למודל התמונות
    db.ts                         # Prisma client singleton
    user.ts                       # getOrCreateWorkspace() — User/Brand/Client/Campaign
  middleware.ts                   # Clerk route protection
prisma/
  schema.prisma                   # ⭐ מקור האמת לסכמה
  migrations/                     # 20260530192855_init, 20260531120000_brand_palette
```

⭐ = הקבצים שנוגעים בהם הכי הרבה.

---

## 4. מודל הנתונים (Prisma)

- **User** (Clerk) → **Brand[]**, **Client[]**
- **Brand**: `name, description, styleTemplate, stylePrompt(Text), subjects(Json), palette(Json)` → **Reference[]**, **Generation[]**
- **Reference**: `blobUrl, name, kind` (turnaround|product|mood|other)
- **Client** → **Campaign[]**
- **Campaign** → **Generation[]** (משויך גם ל-Brand)
- **Generation**: `scene, prompt, modelText, aspectRatio, imageSize, references(Json), blobUrl, rating, notes, tags`

**Phase 1 הוא single-brand-per-user** — `getOrCreateWorkspace()` יוצר אוטומטית Brand "My Brand" + Client "My Work" + Campaign "General" בכניסה ראשונה.

---

## 5. הרצה מקומית (Mac) — Runbook

```bash
cd /Users/yennok/visual-lab
npm run dev          # → http://localhost:3000
```

**אם פורט תפוס:** `lsof -ti:3000 | xargs kill -9`

**אחרי git pull עם שינויי סכמה — חובה את שלושת אלה לפני dev:**
```bash
npx prisma migrate deploy   # מוסיף עמודות חדשות ל-DB
npx prisma generate         # מרענן את Prisma Client (מתקן "Unknown argument")
rm -rf .next                # מנקה cache ישן של Turbopack
npm run dev
```

> ⚠️ **לקח מהסשן הזה**: ה-`prisma generate` שרץ ב-hook של הסביבה בענן **לא** משפיע על המחשב המקומי. כל שינוי בסכמה דורש `prisma generate` + `migrate deploy` מקומית.

---

## 6. משתני סביבה (env)

| משתנה | מטרה |
|---|---|
| `GEMINI_API_KEY` | מפתח Gemini (גם לניתוח וגם ליצירה) |
| `GEMINI_ANALYSIS_MODEL` | ברירת מחדל `gemini-2.5-flash` (זול, vision) |
| `GEMINI_IMAGE_MODEL` | ברירת מחדל `gemini-3-pro-image-preview` (יקר, יצירה) |
| `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` | DB (Postgres) |
| Clerk keys | אימות |
| Vercel Blob token | אחסון תמונות |

---

## 7. מה הלאה — Backlog לפי עדיפות

הנקודה: **הוכחנו שהמנוע נותן "וואו" על מותג אמיתי.** עכשיו מחזקים.

1. **Slice 2 — Subjects עם תמונות** 🎯 (הבא בתור)
   `Brand.subjects` כבר קיים בסכמה אבל בלי תמונות ייעודיות. להוסיף דמויות/מוצרים עם reference images משלהם, כך ש-`buildBrandPrompt` יזריק אותם.
2. **חיזוק המנוע** — לאפשר יותר reference images לניתוח/יצירה; לכוונן את prompt הניתוח (`INSTRUCTION` ב-`brand-analysis.ts`) אם הפלט לא קולע.
3. **Packaging ל-concierge** — workflow מסודר להקמת מותג ללקוח.
4. **Self-serve polish** (CMYK/RGB וכו') — **עוד לא הוחלט.** לא להשקיע עד שיש החלטה.

---

## 8. החלטות מנחות (כדי לא לפתוח מחדש)

- **Engine + Concierge קודם, self-serve אחר כך** — לא מלטשים self-serve לפני שמוכיחים ערך.
- **שני מודלים נפרדים**: ניתוח = flash זול; יצירה = pro יקר. לא לבלבל.
- **Single-brand-per-user ב-Phase 1** — multi-brand + onboarding wizard מאוחר יותר.
- **stylePrompt הוא הלב** — הוא נכנס לכל יצירה. שיפור איכות מתחיל מ-prompt הניתוח ומ-reference images, לא מקוד היצירה.

---

## 9. Changelog

- **2026-05-31** — תוקנה קריסת Analyze: נוספה עמודת `Brand.palette` (Json) + מיגרציה `20260531120000_brand_palette`. Analyze נבדק על מותג אמיתי → עובד מעולה. נוצר מסמך handoff זה.
