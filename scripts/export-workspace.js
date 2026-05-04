#!/usr/bin/env node

/**
 * Workspace PDF Export Script — Puppeteer
 *
 * Renders the /export/workspace/{scriptId} route into a
 * landscape letter-size PDF using headless Chromium.
 *
 * Usage:
 *   node scripts/export-workspace.js <scriptId> [outputPath]
 *
 * Arguments:
 *   scriptId   — UUID of the script
 *   outputPath — (optional) Path to save the PDF. Defaults to stdout.
 *
 * Environment:
 *   FRONTEND_URL — Base URL of the Next.js app (default: http://localhost:3000)
 *
 * Exit codes:
 *   0  — Success
 *   1  — Missing arguments or error
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

async function main() {
  const scriptId = process.argv[2];
  const outputPath = process.argv[3] || null;

  if (!scriptId) {
    console.error("Usage: node export-workspace.js <scriptId> [outputPath]");
    process.exit(1);
  }

  const url = `${FRONTEND_URL}/export/workspace/${scriptId}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    });

    const page = await browser.newPage();

    // Landscape Letter: 11in × 8.5in
    await page.setViewport({ width: 1056, height: 816, deviceScaleFactor: 2 });

    console.error(`[export] Navigating to ${url}`);
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for the export root element to be rendered
    await page.waitForSelector("#export-root", { timeout: 15000 });

    // Wait an extra beat for images to settle
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const images = document.querySelectorAll("img");
        if (images.length === 0) return resolve();
        let loaded = 0;
        const check = () => {
          loaded++;
          if (loaded >= images.length) resolve();
        };
        images.forEach((img) => {
          if (img.complete) {
            check();
          } else {
            img.addEventListener("load", check);
            img.addEventListener("error", check);
          }
        });
        // Safety timeout
        setTimeout(resolve, 5000);
      });
    });

    const pdfBuffer = await page.pdf({
      width: "11in",
      height: "8.5in",
      landscape: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: false,
    });

    if (outputPath) {
      fs.writeFileSync(outputPath, pdfBuffer);
      console.error(`[export] PDF saved to ${outputPath}`);
    } else {
      // Write to stdout for piping
      process.stdout.write(pdfBuffer);
    }

    process.exit(0);
  } catch (err) {
    console.error("[export] Error:", err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
