import fs from "node:fs";
import path from "node:path";

import { chromium, type LaunchOptions } from "playwright-core";
import { PDFDocument } from "pdf-lib";

import {
  createPdfRenderPayload,
  deletePdfRenderPayload,
} from "@/lib/pdf/html/pdf-render-payload-store";
import type { ShareLinkPdfData } from "@/lib/pdf/share-link-pdf";

const COMMON_BROWSER_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/microsoft-edge",
];

const READY_SELECTOR = "[data-pdf-ready='true']";
const NAVIGATION_TIMEOUT_MS = 45_000;
const BACKGROUND_IMAGE_PATH = "/pdf/imagem-fundo.jpg";

function resolvePlaywrightCacheBrowser() {
  try {
    const pw = require("playwright");
    if (pw?.chromium?.executablePath) {
      const p = pw.chromium.executablePath();
      if (p && fs.existsSync(p)) return p;
    }
  } catch {
    /* playwright package not available */
  }

  const cacheDir =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    path.join(process.env.HOME || "/root", ".cache", "ms-playwright");
  try {
    if (fs.existsSync(cacheDir)) {
      const entries = fs.readdirSync(cacheDir).filter((e) => e.startsWith("chromium-")).sort().reverse();
      for (const entry of entries) {
        const candidate = path.join(cacheDir, entry, "chrome-linux", "chrome");
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

function resolveConfiguredBrowserPath() {
  const configured = process.env.PDF_HTML_BROWSER_PATH?.trim();
  if (configured && fs.existsSync(configured)) {
    return configured;
  }

  for (const candidate of COMMON_BROWSER_CANDIDATES) {
    const absolutePath = path.resolve(candidate);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  const playwrightBrowser = resolvePlaywrightCacheBrowser();
  if (playwrightBrowser) return playwrightBrowser;

  return null;
}

function resolveWaitUntil() {
  const raw = process.env.PDF_HTML_WAIT_UNTIL?.trim().toLowerCase();
  if (raw === "load") {
    return "load";
  }
  if (raw === "domcontentloaded") {
    return "domcontentloaded";
  }
  return "networkidle";
}

function buildLaunchOptions(executablePath: string): LaunchOptions {
  const launchOptions: LaunchOptions = {
    headless: true,
    executablePath,
  };

  if (process.platform === "linux") {
    launchOptions.args = ["--no-sandbox", "--disable-setuid-sandbox"];
  }

  return launchOptions;
}

function resolveRenderBaseUrl() {
  const explicit =
    process.env.PDF_RENDER_BASE_URL?.trim() ||
    process.env.INTERNAL_BASE_URL?.trim() ||
    process.env.PUBLIC_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim();

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const port = process.env.PORT?.trim() || "3000";
  return `http://localhost:${port}`;
}

function isPreloadableImageSource(value: string) {
  return (
    value.startsWith("/") || /^https?:\/\//i.test(value) || value.startsWith("data:")
  );
}

function resolveBackgroundPreloadCandidates(data: ShareLinkPdfData) {
  const uniqueCandidates = new Set<string>([BACKGROUND_IMAGE_PATH]);
  data.catalogs.forEach((catalog) => {
    const normalized = typeof catalog.pdfBackgroundImageUrl === "string"
      ? catalog.pdfBackgroundImageUrl.trim()
      : "";
    if (normalized) {
      uniqueCandidates.add(normalized);
    }
  });

  return [...uniqueCandidates].filter(isPreloadableImageSource);
}

async function mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create();
  for (const buf of buffers) {
    const doc = await PDFDocument.load(buf);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const p of pages) {
      merged.addPage(p);
    }
  }
  const bytes = await merged.save();
  return Buffer.from(bytes);
}

export async function generateShareLinkHtmlPdf(data: ShareLinkPdfData): Promise<Buffer> {
  const executablePath = resolveConfiguredBrowserPath();
  if (!executablePath) {
    throw new Error(
      "No Chromium browser executable found for HTML PDF engine. Configure PDF_HTML_BROWSER_PATH.",
    );
  }

  const token = await createPdfRenderPayload(data);
  const renderUrl = `${resolveRenderBaseUrl()}/pdf-render/catalog?token=${encodeURIComponent(token)}`;

  const browser = await chromium.launch(buildLaunchOptions(executablePath));
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1810 },
    });

    const response = await page.goto(renderUrl, {
      waitUntil: resolveWaitUntil(),
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    if (!response || !response.ok()) {
      const status = response?.status() ?? "no_response";
      throw new Error(`PDF template page failed with status ${status}`);
    }

    await page.waitForSelector(READY_SELECTOR, { timeout: NAVIGATION_TIMEOUT_MS });

    const backgroundCandidates = resolveBackgroundPreloadCandidates(data);

    try {
      await page.waitForFunction(
        (imageUrls) => {
          type BackgroundState = "pending" | "ready" | "error" | undefined;
          type WindowWithBackgroundState = Window & {
            __PDF_BG_READY_STATE__?: Record<string, BackgroundState>;
          };

          const pageWindow = window as WindowWithBackgroundState;
          const state = pageWindow.__PDF_BG_READY_STATE__ ?? {};
          pageWindow.__PDF_BG_READY_STATE__ = state;

          imageUrls.forEach((imageUrl) => {
            if (!state[imageUrl]) {
              state[imageUrl] = "pending";
              const image = new Image();
              image.onload = () => {
                state[imageUrl] = "ready";
              };
              image.onerror = () => {
                state[imageUrl] = "error";
              };
              image.src = imageUrl;
            }
          });

          return imageUrls.every(
            (imageUrl) => state[imageUrl] === "ready" || state[imageUrl] === "error",
          );
        },
        backgroundCandidates,
        { timeout: 7_000 },
      );
    } catch {
      console.warn("[pdf] Background preload timed out.", backgroundCandidates);
    }

    // Count how many PAGE sections exist (direct children of main[data-pdf-ready])
    const PAGE_SECTION_SELECTOR = "section[data-pdf-page]";

    const sectionCount = await page.evaluate((selector) => {
      return document.querySelectorAll(selector).length;
    }, PAGE_SECTION_SELECTOR);

    console.log(`[pdf] Found ${sectionCount} page sections. Generating per-page PDFs.`);

    if (sectionCount <= 1) {
      // Single page — generate directly
      const pdf = await page.pdf({
        width: "210mm",
        height: "373.3mm",
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });
      return Buffer.from(pdf);
    }

    // Multi-page: generate each page separately by hiding other page sections
    const pageBuffers: Buffer[] = [];

    for (let i = 0; i < sectionCount; i++) {
      // Show only the i-th page section, hide all others
      await page.evaluate((args) => {
        const { selector, targetIndex } = args;
        const pageSections = document.querySelectorAll(selector);
        pageSections.forEach((section, idx) => {
          const el = section as HTMLElement;
          if (idx === targetIndex) {
            el.style.removeProperty("display");
          } else {
            el.style.setProperty("display", "none", "important");
          }
        });
        void document.body.offsetHeight;
      }, { selector: PAGE_SECTION_SELECTOR, targetIndex: i });

      const pagePdf = await page.pdf({
        width: "210mm",
        height: "373.3mm",
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });

      pageBuffers.push(Buffer.from(pagePdf));
    }

    // Restore all sections (cleanup)
    await page.evaluate((selector) => {
      document.querySelectorAll(selector).forEach((section) => {
        (section as HTMLElement).style.removeProperty("display");
      });
    }, PAGE_SECTION_SELECTOR);

    console.log(`[pdf] Merging ${pageBuffers.length} page PDFs.`);
    return await mergePdfBuffers(pageBuffers);
  } finally {
    await browser.close();
    await deletePdfRenderPayload(token);
  }
}
