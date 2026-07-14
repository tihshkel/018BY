/**
 * Создаёт 5 альбомов в облаке и заполняет текстовые поля на каждой странице.
 *
 * Запуск (пароль не хранить в файле / git):
 *   $env:SEED_EMAIL="..."; $env:SEED_PASSWORD="..."; npx tsx scripts/seed-filled-albums.ts
 *
 * Или:
 *   npm run seed:albums
 *
 * Нужны EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY (из .env).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getAlbumPageSchemas } from '../constants/generated/album-page-schemas';
import { PAGE_SCHEMA_VERSION, type AlbumPageField } from '../types/album-page-schema';
import { refreshPageValuesStatus } from '../utils/pageStatus';

type AlbumSpec = {
  lineGuideId: string;
  category: string;
  title: string;
};

const ALBUMS: AlbumSpec[] = [
  {
    lineGuideId: 'pregnancy_60',
    category: 'pregnancy',
    title: 'Ожидание чуда — 60 стр. (seed)',
  },
  {
    lineGuideId: 'pregnancy_a5',
    category: 'pregnancy',
    title: 'Ожидание чуда — 48 стр. (seed)',
  },
  {
    lineGuideId: 'kids_48',
    category: 'kids',
    title: 'Первые годы малыша — 48 стр. (seed)',
  },
  {
    lineGuideId: 'diary_interior_brown',
    category: 'diary',
    title: 'Мои истории — дневник 60 стр. (seed)',
  },
  {
    lineGuideId: 'diary_interior_purple',
    category: 'diary',
    title: 'Мои истории — дневник 40 стр. (seed)',
  },
];

const SAMPLE_PHRASES = [
  'Я была счастлива и рада',
  'Этот день запомнился мне навсегда',
  'Мы улыбались и обнимали друг друга',
  'Чувствовала тепло и спокойствие',
  'Хочу сохранить этот момент',
  'Сердце наполнилось любовью',
  'Было тихо, уютно и светло',
  'Я благодарна за этот день',
  'Мы смеялись и говорили о будущем',
  'Кажется, время остановилось',
  'Рядом были самые близкие люди',
  'Хочется возвращаться сюда мыслями',
];

const NAME_POOL = [
  'Анна',
  'Мария',
  'Елена',
  'София',
  'Дарья',
  'Иван',
  'Артём',
  'Михаил',
  'Александр',
  'Лев',
];

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function createId(prefix = 'id'): string {
  const ts = Date.now().toString(36);
  const rand1 = Math.random().toString(36).slice(2, 10);
  const rand2 = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${ts}_${rand1}${rand2}`;
}

function sleep(ms: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function pickPhrase(seed: number): string {
  return SAMPLE_PHRASES[seed % SAMPLE_PHRASES.length];
}

function pickName(seed: number): string {
  return NAME_POOL[seed % NAME_POOL.length];
}

function approxMaxChars(field: AlbumPageField): number {
  if (field.maxLength != null && field.maxLength > 0) return field.maxLength;
  const lines = Math.max(1, field.templateLineCount ?? 1);
  if (lines >= 4) return Math.min(220, lines * 36);
  if (lines === 3) return 90;
  if (lines === 2) return 54;
  return 28;
}

function fillText(field: AlbumPageField, seed: number): string {
  const label = (field.label ?? '').toLowerCase();
  const max = approxMaxChars(field);

  let base: string;
  if (/имя|name|зовут/.test(label)) {
    base = pickName(seed);
  } else if (/друг|подруг|мама|папа|бабуш|дедуш/.test(label)) {
    base = pickName(seed + 3);
  } else if (/цвет/.test(label)) {
    base = 'Голубой';
  } else if (/сезон|время года/.test(label)) {
    base = 'Лето';
  } else if (/цвет(ы|ок)|цветк/.test(label)) {
    base = 'Пионы';
  } else if (/животн|питом/.test(label)) {
    base = 'Кот Барсик';
  } else if (/школ|класс/.test(label)) {
    base = 'Люблю учиться и друзей';
  } else if (/кем|стать|хочу/.test(label)) {
    base = 'Хочу стать врачом и помогать людям';
  } else if (/телефон|phone/.test(label)) {
    base = '+7 900 123-45-67';
  } else if (/город|адрес/.test(label)) {
    base = 'Москва';
  } else if (/реакц|чувств|эмоц|мысл|истор|запис|пилот|письм|мечт/.test(label)) {
    base = `${pickPhrase(seed)}. ${pickPhrase(seed + 1)}`;
  } else {
    base = pickPhrase(seed);
  }

  if (base.length <= max) return base;
  return base.slice(0, Math.max(1, max)).trim();
}

function sampleFieldValue(field: AlbumPageField, seed: number): string {
  switch (field.type) {
    case 'date':
      return '15.03.2024';
    case 'time':
      return '14:30';
    case 'number': {
      const label = (field.label ?? '').toLowerCase();
      if (/вес/.test(label)) return '3400';
      if (/рост/.test(label)) return '52';
      if (/недел/.test(label)) return '22';
      return '12';
    }
    case 'radio':
      return field.options?.[seed % (field.options.length || 1)] ?? field.options?.[0] ?? '';
    case 'checkbox':
      return seed % 2 === 0 ? '1' : '';
    case 'text':
    default:
      return fillText(field, seed);
  }
}

function buildFilledProject(spec: AlbumSpec, index: number) {
  const schemas = getAlbumPageSchemas(spec.lineGuideId);
  if (!schemas.length) {
    throw new Error(`Нет схем страниц для ${spec.lineGuideId}`);
  }

  const projectId = `${Date.now()}${index}_${spec.lineGuideId}`;
  const instances = schemas.map((schema, imageIndex) => ({
    instanceId: createId('page'),
    schemaPageId: schema.pageId,
    sourcePageNumber: schema.sourcePageNumber,
    order: imageIndex + 1,
    addedByUser: false,
    imageIndex,
    templateLibraryId: schema.templateLibraryId,
  }));

  const pageValuesMap: Record<string, ReturnType<typeof refreshPageValuesStatus>> = {};
  let filledFields = 0;

  for (const instance of instances) {
    const schema =
      schemas.find((s) => s.pageId === instance.schemaPageId) ??
      schemas.find((s) => s.sourcePageNumber === instance.sourcePageNumber);
    const fields: Record<string, string> = {};
    if (schema?.fields?.length) {
      schema.fields.forEach((field, fieldIndex) => {
        const value = sampleFieldValue(field, index * 1000 + instance.order * 17 + fieldIndex);
        if (value) {
          fields[field.fieldId] = value;
          filledFields += 1;
        }
      });
    }

    const values = {
      fields,
      photoBlocks: {},
      status: 'empty' as const,
      updatedAt: new Date().toISOString(),
    };

    pageValuesMap[instance.instanceId] = schema
      ? refreshPageValuesStatus(schema, values)
      : { ...values, status: Object.keys(fields).length ? 'filled' : 'empty' };
  }

  const meta = {
    id: projectId,
    title: spec.title,
    category: spec.category,
    albumId: spec.lineGuideId,
    interiorType: spec.lineGuideId,
    coverType: spec.lineGuideId,
    createdAt: new Date().toISOString(),
    isReadyMadeAlbum: true,
    hasPdfTemplate: true,
    pagesCount: schemas.length,
  };

  // Картинки не кладём в облако: при открытии приложение подтянет локальные макеты.
  const dataJson: Record<string, string> = {
    [`@project_${projectId}`]: JSON.stringify(meta),
    [`@project_page_instances_${projectId}`]: JSON.stringify(instances),
    [`@project_page_values_${projectId}`]: JSON.stringify(pageValuesMap),
    [`@project_schema_version_${projectId}`]: PAGE_SCHEMA_VERSION,
    [`@project_annotations_${projectId}`]: '[]',
  };

  return { projectId, meta, dataJson, pages: schemas.length, filledFields };
}

async function main() {
  loadEnvFile();

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const email = process.env.SEED_EMAIL?.trim();
  const password = process.env.SEED_PASSWORD?.trim();

  if (!url || !anonKey) {
    throw new Error('Нужны EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
  if (!email || !password) {
    throw new Error('Задайте SEED_EMAIL и SEED_PASSWORD в окружении');
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('Вход…', email);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !authData.user) {
    throw new Error(`Ошибка входа: ${authError?.message ?? 'нет user'}`);
  }

  const userId = authData.user.id;
  console.log('user_id =', userId);

  const { data: existingSync, error: syncReadError } = await supabase
    .from('user_sync')
    .select('data_json')
    .eq('user_id', userId)
    .maybeSingle();
  if (syncReadError) {
    throw new Error(`Не удалось прочитать user_sync: ${syncReadError.message}`);
  }

  const core: Record<string, string> = {
    ...((existingSync?.data_json as Record<string, string> | null) ?? {}),
  };

  let projectList: Array<Record<string, unknown>> = [];
  try {
    const parsed = JSON.parse(core['@user_projects'] || '[]');
    if (Array.isArray(parsed)) projectList = parsed;
  } catch {
    projectList = [];
  }

  const created: Array<{ title: string; projectId: string; pages: number; filledFields: number }> =
    [];

  for (let i = 0; i < ALBUMS.length; i += 1) {
    const spec = ALBUMS[i];
    await sleep(25);
    const built = buildFilledProject(spec, i);
    console.log(
      `→ ${spec.title}: pages=${built.pages}, textFields=${built.filledFields}, id=${built.projectId}`,
    );

    const { error: projectError } = await supabase.from('user_project_data').upsert(
      {
        user_id: userId,
        project_id: built.projectId,
        data_json: built.dataJson,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,project_id' },
    );
    if (projectError) {
      throw new Error(`Не удалось сохранить проект ${built.projectId}: ${projectError.message}`);
    }

    projectList = projectList.filter((p) => p?.id !== built.projectId);
    projectList.unshift(built.meta);
    created.push({
      title: built.meta.title,
      projectId: built.projectId,
      pages: built.pages,
      filledFields: built.filledFields,
    });
  }

  if (!core['@user_name']) {
    core['@user_name'] = 'Сидер альбомов';
  }
  core['@user_projects'] = JSON.stringify(projectList);

  const { error: coreError } = await supabase.from('user_sync').upsert(
    {
      user_id: userId,
      data_json: core,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (coreError) {
    throw new Error(`Не удалось обновить user_sync: ${coreError.message}`);
  }

  console.log('\nГотово. Создано альбомов:', created.length);
  for (const item of created) {
    console.log(`- ${item.title} | ${item.pages} стр. | полей: ${item.filledFields} | ${item.projectId}`);
  }
  console.log('\nВ приложении: выйдите/войдите или потяните синк, затем откройте проекты с пометкой (seed).');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
