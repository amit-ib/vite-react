import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import fs from "fs";

// Read WCAG level from CLI
const wcagLevel = process.argv[2] || "aa";

const WCAG_TAGS = {
  a: ["wcag2a"],
  aa: ["wcag2a", "wcag2aa"],
  aaa: ["wcag2a", "wcag2aa", "wcag2aaa"],
};

const selectedTags = WCAG_TAGS[wcagLevel.toLowerCase()] || WCAG_TAGS["aa"];

console.log(
  `🔍 Running accessibility scan using WCAG level: ${wcagLevel.toUpperCase()}`
);

const runA11yScan = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("http://localhost:5173/");

  const results = await new AxeBuilder({ page })
    .withTags(selectedTags)
    .analyze();

  const html = generateReadableHTML(results, wcagLevel);

  if (!fs.existsSync("accessibility-report")) {
    fs.mkdirSync("accessibility-report");
  }

  fs.writeFileSync("accessibility-report/a11y-report.html", html);

  console.log(
    "✨ Readable accessibility report generated: accessibility-report/a11y-report.html"
  );

  await browser.close();
};

function generateReadableHTML(results, wcagLevel) {
  const styles = `
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; background: #fafafa; }
      h1 { text-align: center; }
      .violation-card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .impact-critical { border-left: 8px solid #b30000; }
      .impact-serious { border-left: 8px solid #e63946; }
      .impact-moderate { border-left: 8px solid #ffb703; }
      .impact-minor { border-left: 8px solid #2a9d8f; }

      .impact-label {
        font-weight: bold;
        padding: 5px 10px;
        border-radius: 6px;
        display: inline-block;
        color: white;
        margin-bottom: 10px;
      }
      .critical { background: #b30000; }
      .serious { background: #e63946; }
      .moderate { background: #ffb703; color: black; }
      .minor { background: #2a9d8f; }

      .node-list {
        background: #f5f5f5;
        padding: 10px;
        border-radius: 6px;
        font-family: monospace;
        margin-top: 10px;
      }

      details { margin-top: 10px; }
      summary { cursor: pointer; font-weight: bold; }
      a { color: #0077cc; }
    </style>
  `;

  const violationHTML = results.violations
    .map((v) => {
      const impact = v.impact || "moderate";

      return `
      <div class="violation-card impact-${impact}">
        <h2>${v.id} — ${v.description}</h2>

        <span class="impact-label ${impact}">
          Impact: ${impact.toUpperCase()}
        </span>

        <p><strong>Help:</strong> <a href="${v.helpUrl}" target="_blank">${
        v.help
      }</a></p>

        <details>
          <summary>Show affected elements (${v.nodes.length})</summary>
          ${v.nodes
            .map(
              (n) => `
            <div class="node-list">
              <strong>Target:</strong> ${n.target.join(", ")}<br/>
              <strong>Failure Summary:</strong> ${n.failureSummary || "N/A"}
            </div>
          `
            )
            .join("")}
        </details>

        <p><strong>Tags:</strong> ${v.tags.join(", ")}</p>
      </div>`;
    })
    .join("");

  return `
    <html>
      <head>
        <title>Readable Accessibility Report</title>
        ${styles}
      </head>
      <body>
        <h1>Accessibility Report (WCAG ${wcagLevel.toUpperCase()})</h1>
        <h3>Total Violations: ${results.violations.length}</h3>
        ${violationHTML}
      </body>
    </html>
  `;
}

runA11yScan();
