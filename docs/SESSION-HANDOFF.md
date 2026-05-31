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
- ✅ **Composer v2 + Gallery** ב-`/app` — שפר-פרומפט, בחירת palette/tags (override per-generation), reference picker + העלאה זמנית
- ✅ סכמת DB + מיגרציות (כולל עמודת `palette` שתוקנה בסשן זה)

**ענף עבודה**: `claude/compassionate-cori-skKiT` (committed + pushed, נקי)

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
      actions.ts                  # server action: improvePrompt (שפר פרומפט)
      _components/composer.tsx    # טופס יצירה: scene + improve + palette/tags/refs overrides
      _components/reference-picker.tsx  # בחירת references המותג + העלאה זמנית ליצירה
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
    prompt-improve.ts             # improveScenePrompt() — שפר פרומפט (Gemini text)
    brand-prompt.ts               # buildBrandPrompt(stylePrompt, subjects, scene, tags, palette)
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

- **2026-05-31 (סשן 3)** — **Workspace Composer v2** (ענף `claude/compassionate-cori-skKiT`):
  - **שפר פרומפט**: כפתור "✨ Improve prompt" ב-Composer → server action `improvePrompt` (`src/app/app/actions.ts`) → `improveScenePrompt` (`src/lib/prompt-improve.ts`, דפוס Gemini-text כמו `brand-analysis`). התוצאה **מחליפה את הטקסט בתיבה** (ניתן לעריכה).
  - **בחירת palette + tags ב-Composer**: chips של `brand.palette`/`brand.tags`, **כולם מסומנים כברירת מחדל**, toggle. ההורדה היא **override ליצירה הזו בלבד** — לא משנה את המותג השמור. `palette` כעת **פעיל ביצירה** (`buildBrandPrompt` מוסיף שורת `Color palette:`; קודם נשמר ולא בשימוש).
  - **Reference picker** (`src/app/app/_components/reference-picker.tsx`): מציג את מאגר ה-references המשותף של המותג לבחירה (default הכל), **+ העלאת תמונות זמניות** ליצירה הנוכחית בלבד — לא נשמרות ל-`Reference` (מועברות כ-`extraReferenceUrls`, fetch מוגן ב-whitelist ל-host של Vercel Blob נגד SSRF).
  - **`/api/generate`** קיבל שדות אופציונליים: `palette`, `tags`, `referenceIds`, `extraReferenceUrls` (כולם backward-compatible; מערך ריק=override "בלי", `undefined`=ברירת מחדל מהמותג). **ללא שינוי סכמה.**
- **2026-05-31 (סשן 2)** — **Slice 2 + Brand Studio editable inputs** (ענף `claude/compassionate-cori-skKiT`):
  - **Slice 2 — Subjects עם תמונות**: `BrandSubject` קיבל `refIds`; ב-Brand Studio אפשר לשייך reference images לכל subject (בורר thumbnails). `/api/generate` מאכיל קודם את תמונות ה-subject (מתויגות בשם ה-subject דרך `label` חדש ב-`generateImage`), ואז ממלא בשאר ה-references לסגנון (cap הועלה ל-6). `buildBrandPrompt` מוסיף רמז לשמירת עקביות מול התמונות המתויגות.
  - **Palette עריכה**: `PaletteEditor` — עריכת/מחיקת/הוספת גוונים (color picker + hex), כולל **"Extract from image"** שמחלץ קודי hex/RGB שכתובים כטקסט בתמונה (למשל צילום מסך של brand guideline) דרך Gemini vision (`extractPaletteFromImage`). פאלטה ידנית עד 12 גוונים.
  - **Tags**: הניתוח מחזיר עכשיו 5-8 highlights → נשמרים ל-`Brand.tags` (עמודה+מיגרציה `20260531130000_brand_tags`). `TagsEditor` לעריכה/הוספה/מחיקה ידנית. הניתוח ממזג tags חדשים עם קיימים.
  - הפילוסופיה: **AI analysis + הזנה ידנית** = עקביות מותג נשלטת ע"י המשתמש.
- **2026-05-31** — תוקנה קריסת Analyze: נוספה עמודת `Brand.palette` (Json) + מיגרציה `20260531120000_brand_palette`. Analyze נבדק על מותג אמיתי → עובד מעולה. נוצר מסמך handoff זה.
