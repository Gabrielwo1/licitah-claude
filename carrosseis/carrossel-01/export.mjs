/**
 * Exporta cada slide-*.html como PNG de alta qualidade (1080x1350 @2x).
 *
 * Uso:
 *   npm i -D puppeteer
 *   node carrosseis/carrossel-01/export.mjs
 *
 * Saída: carrosseis/carrossel-01/png/slide-01.png ... slide-07.png
 */
import { readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import puppeteer from 'puppeteer';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, 'png');
const WIDTH = 1080;
const HEIGHT = 1350;
const SCALE = 2; // 2160x2700 — nitidez para feed

const slides = (await readdir(DIR))
  .filter((f) => /^slide-\d+\.html$/.test(f))
  .sort();

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

for (const file of slides) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE });
  await page.goto(pathToFileURL(join(DIR, file)).href, { waitUntil: 'networkidle0' });
  // garante carregamento das fontes do Google
  await page.evaluateHandle('document.fonts.ready');
  const out = join(OUT, file.replace('.html', '.png'));
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  console.log('✔', out);
  await page.close();
}

await browser.close();
console.log(`\n${slides.length} slides exportados em ${OUT}`);
