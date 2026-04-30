#!/usr/bin/env node
/**
 * export_deck_pdf.mjs — экспортирует многофайловую презентацию в единый векторный PDF
 *
 * Использование:
 *   node export_deck_pdf.mjs --slides <dir> --out <file.pdf> [--width 1920] [--height 1080]
 *
 * Особенности:
 *   - Текст остается векторным (можно копировать и искать)
 *   - Фоны и графика сохраняются 1:1 (рендерит Chromium через Playwright)
 *   - HTML не нужно дорабатывать
 *   - Визуальных потерь нет: PDF — это печать из браузера
 *
 * Ограничение:
 *   - Текст в PDF нельзя редактировать напрямую (правки нужно делать в HTML)
 *
 * Зависимости: playwright pdf-lib
 *   npm install playwright pdf-lib
 *
 * Слайды сортируются по имени файла (01-xxx.html → 02-xxx.html → ...)
 * Перед экспортом требуется asset-manifest.json в рабочей директории презентации.
 */

import fs from 'fs/promises';
import path from 'path';
import { checkAssetGate } from './asset_gate_check.mjs';

const TRACE_STARTED_AT = Date.now();
const COMMAND = ['node', path.basename(process.argv[1] || 'export_deck_pdf.mjs'), ...process.argv.slice(2)].join(' ');

async function appendRunTrace(event) {
  try {
    const exportsDir = path.resolve('exports');
    await fs.mkdir(exportsDir, { recursive: true });
    await fs.appendFile(
      path.join(exportsDir, 'run-trace.jsonl'),
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        script: 'export_deck_pdf.mjs',
        command: COMMAND,
        pid: process.pid,
        ...event,
      })}\n`,
      'utf8',
    );
  } catch {
    // Telemetry must never break exports.
  }
}

function parseArgs() {
  const args = { width: 1920, height: 1080 };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i += 2) {
    const k = a[i].replace(/^--/, '');
    args[k] = a[i + 1];
  }
  if (!args.slides || !args.out) {
    console.error('Использование: node export_deck_pdf.mjs --slides <dir> --out <file.pdf> [--width 1920] [--height 1080]');
    process.exit(1);
  }
  args.width = parseInt(args.width);
  args.height = parseInt(args.height);
  return args;
}

async function main() {
  const { slides, out, width, height } = parseArgs();
  const slidesDir = path.resolve(slides);
  const outFile = path.resolve(out);

  const assetGate = await checkAssetGate({ slides, mode: 'preexport' });
  for (const warning of assetGate.warnings) console.error(`Предупреждение asset gate: ${warning}`);
  if (assetGate.errors.length) {
    console.error(`Asset gate failed: ${assetGate.manifestPath}`);
    assetGate.errors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
  }

  const files = (await fs.readdir(slidesDir))
    .filter(f => f.endsWith('.html'))
    .sort();
  if (!files.length) {
    console.error(`В ${slidesDir} не найдены .html-файлы`);
    process.exit(1);
  }
  console.log(`Найдено слайдов: ${files.length} в ${slidesDir}`);

  const { chromium } = await import('playwright');
  const { PDFDocument } = await import('pdf-lib');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height } });

  // 1) Рендерим каждый HTML в отдельный PDF-буфер
  const pageBuffers = [];
  for (const f of files) {
    const page = await ctx.newPage();
    const url = 'file://' + path.join(slidesDir, f);
    await page.goto(url, { waitUntil: 'networkidle' }).catch(() => page.goto(url));
    await page.waitForTimeout(1200);  // ждем отрисовку веб-шрифтов
    // Эмулируем media="screen", чтобы цвета и фоны CSS совпадали с браузером
    await page.emulateMedia({ media: 'screen' });
    const buf = await page.pdf({
      width: `${width}px`,
      height: `${height}px`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: false,
    });
    pageBuffers.push(buf);
    await page.close();
    console.log(`  [${pageBuffers.length}/${files.length}] ${f}`);
  }

  await browser.close();

  // 2) Объединяем страницы в один PDF
  const merged = await PDFDocument.create();
  for (const buf of pageBuffers) {
    const src = await PDFDocument.load(buf);
    const copied = await merged.copyPages(src, src.getPageIndices());
    copied.forEach(p => merged.addPage(p));
  }
  const bytes = await merged.save();
  await fs.writeFile(outFile, bytes);

  const kb = (bytes.byteLength / 1024).toFixed(0);
  console.log(`\n✓ Записан файл ${outFile}  (${kb} KB, страниц: ${files.length}, векторный PDF)`);
  await appendRunTrace({
    phase: 'export_pdf',
    status: 'ok',
    duration_ms: Date.now() - TRACE_STARTED_AT,
    slide_count: files.length,
    out: path.relative(process.cwd(), outFile),
    output_bytes: bytes.byteLength,
  });
}

main().catch(async e => {
  await appendRunTrace({
    phase: 'export_pdf',
    status: 'error',
    duration_ms: Date.now() - TRACE_STARTED_AT,
    error: e?.message || String(e),
  });
  console.error(e);
  process.exit(1);
});
