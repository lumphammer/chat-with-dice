/**
 * Render benchmarks for React Compiler on vs off. See bench/README.md.
 *
 *   node bench/run.ts --room <roomId>
 */
import { installReactCommitRecorder } from "./reactCommitRecorder.ts";
import { spawn } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type CDPSession,
  type Page,
} from "playwright";

const { values: args } = parseArgs({
  options: {
    room: { type: "string" },
    variants: { type: "string", default: "off,on" },
    iterations: { type: "string", default: "5" },
    rounds: { type: "string", default: "2" },
    cpu: { type: "string", default: "4" },
    port: { type: "string", default: "4400" },
    "skip-build": { type: "boolean", default: false },
    scenarios: { type: "string" },
    headed: { type: "boolean", default: false },
    // e.g. org.chromium.Chromium, for systems where Playwright's own Chromium
    // can't run
    flatpak: { type: "string" },
  },
});

if (!args.room) {
  console.error("usage: node bench/run.ts --room <roomId> [options]");
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, "..");
const VARIANTS = args.variants.split(",");
const ITERATIONS = Number(args.iterations);
const ROUNDS = Number(args.rounds);
const CPU_THROTTLE = Number(args.cpu);
const PORT = Number(args.port);
const BASE_URL = `http://localhost:${PORT}`;
const ROOM_URL = `${BASE_URL}/rooms/${args.room}`;
const HISTORY_TARGET = 100;
const QUIET_MS = 600;
const VIEWPORT = { width: 1440, height: 900 };

const buildDir = (variant: string) => path.join(ROOT, "bench/.builds", variant);

// ---------------------------------------------------------------------------
// building and serving

const run = (command: string, argv: string[], env: Record<string, string>) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, argv, {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "ignore", "inherit"],
    });
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${argv.join(" ")} exited ${code}`)),
    );
  });

const build = async (variant: string) => {
  console.log(`building compiler=${variant}`);
  await run("pnpm", ["exec", "astro", "build", "--outDir", buildDir(variant)], {
    BENCH_REACT_COMPILER: variant,
    BENCH_PROFILING: "1",
  });
};

// `astro preview` doesn't take --outDir: it runs whichever worker the last
// build pointed wrangler's redirect file at. So we point it at the variant we
// want, and put the original back at the end.
const WRANGLER_REDIRECT = path.join(ROOT, ".wrangler/deploy/config.json");

const pointWranglerAt = (variant: string) => {
  const server = path.relative(
    path.dirname(WRANGLER_REDIRECT),
    path.join(buildDir(variant), "server"),
  );
  return writeFile(
    WRANGLER_REDIRECT,
    JSON.stringify({
      configPath: `${server}/wrangler.json`,
      auxiliaryWorkers: [],
      prerenderWorkerConfigPath: `${server}/.prerender/wrangler.json`,
    }),
  );
};

// `astro preview` also runs itself in the background and keeps a lock file, so
// there's no child process to hold on to: start it, poll, and ask it to stop.
const startServer = async (variant: string) => {
  await pointWranglerAt(variant);
  await run(
    "pnpm",
    ["exec", "astro", "preview", "--background", "--port", String(PORT)],
    {},
  );
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(ROOM_URL);
      if (response.ok) {
        await assertServing(variant, await response.text());
        return;
      }
    } catch (error) {
      if (error instanceof ServingWrongBuildError) {
        await stopServer();
        throw error;
      }
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  await stopServer();
  throw new Error("preview server did not come up");
};

class ServingWrongBuildError extends Error {}

/** Checks the room page's island script comes from this variant's build. */
const assertServing = async (variant: string, html: string) => {
  const script = html.match(/\/_astro\/DiceRoller\.[\w-]+\.js/)?.[0];
  const built = script
    ? await stat(path.join(buildDir(variant), "client", script)).catch(
        () => null,
      )
    : null;
  if (!built) {
    throw new ServingWrongBuildError(
      `preview is not serving the compiler=${variant} build (${script})`,
    );
  }
};

const stopServer = () => run("pnpm", ["exec", "astro", "preview", "stop"], {});

// ---------------------------------------------------------------------------
// measuring

type CommitRecord = {
  t: number;
  durationMs: number | null;
  renders: number;
  mounts: number;
  rendered: Record<string, number>;
};

type Sample = {
  commits: number;
  renders: number;
  mounts: number;
  reactRenderMs: number;
  scriptMs: number;
  taskMs: number;
  layoutMs: number;
  styleMs: number;
  rendered: Record<string, number>;
};

type CdpMetrics = Record<string, number>;

const getCdpMetrics = async (cdp: CDPSession): Promise<CdpMetrics> => {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
};

const commitCount = (page: Page) =>
  page.evaluate(() => (window as any).__bench.commits.length as number);

/** Waits until React has not committed anything for QUIET_MS. */
const waitForQuiet = (page: Page) =>
  page.waitForFunction(
    (quietMs) => {
      const commits = (window as any).__bench.commits;
      const last = commits[commits.length - 1];
      return !last || performance.now() - last.t > quietMs;
    },
    QUIET_MS,
    { polling: 50, timeout: 30_000 },
  );

/**
 * Runs `action` and returns everything React and the browser did from the
 * start of it until the page has gone quiet again.
 */
const measure = async (
  page: Page,
  cdp: CDPSession,
  action: () => Promise<void>,
): Promise<Sample> => {
  const startIndex = await commitCount(page);
  const before = await getCdpMetrics(cdp);
  await action();
  await waitForQuiet(page);
  const after = await getCdpMetrics(cdp);
  const commits: CommitRecord[] = await page.evaluate(
    (from) => (window as any).__bench.commits.slice(from),
    startIndex,
  );
  return summarise(commits, before, after);
};

const summarise = (
  commits: CommitRecord[],
  before: CdpMetrics,
  after: CdpMetrics,
): Sample => {
  const delta = (name: string) =>
    ((after[name] ?? 0) - (before[name] ?? 0)) * 1000;
  const rendered: Record<string, number> = {};
  for (const commit of commits) {
    for (const [name, count] of Object.entries(commit.rendered)) {
      rendered[name] = (rendered[name] ?? 0) + count;
    }
  }
  return {
    commits: commits.length,
    renders: commits.reduce((sum, c) => sum + c.renders, 0),
    mounts: commits.reduce((sum, c) => sum + c.mounts, 0),
    reactRenderMs: commits.reduce((sum, c) => sum + (c.durationMs ?? 0), 0),
    scriptMs: delta("ScriptDuration"),
    taskMs: delta("TaskDuration"),
    layoutMs: delta("LayoutDuration"),
    styleMs: delta("RecalcStyleDuration"),
    rendered,
  };
};

// ---------------------------------------------------------------------------
// the room

const rightSidebar = (page: Page) =>
  page.locator('aside[aria-label="Right sidebar"]');

const rollButton = (page: Page) =>
  rightSidebar(page).getByRole("button", {
    name: /^Roll \d/,
    includeHidden: true,
  });

const bubbles = (page: Page) => page.locator('[data-part="scroller"] article');

const openPage = async (context: BrowserContext) => {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });
  return { page, cdp };
};

/** Waits for the room to be connected, caught up and idle. */
const waitForRoomReady = async (page: Page, expectedBubbles: number) => {
  await page.waitForFunction(
    (expected) =>
      document.querySelectorAll('[data-part="scroller"] article').length >=
      expected,
    expectedBubbles,
    { timeout: 60_000 },
  );
  // The Roll dice panel may not be the selected tab, but its form is only
  // rendered once the capability has initialised.
  await rollButton(page).waitFor({ state: "attached", timeout: 30_000 });
  await waitForQuiet(page);
};

/**
 * Remembers the newest chat bubble so that `waitForNewBubble` can tell when a
 * message has arrived, even once the history buffer is full and the count stops
 * going up.
 */
const markLastBubble = (page: Page) =>
  page.evaluate(() => {
    const all = document.querySelectorAll('[data-part="scroller"] article');
    (window as any).__benchLastBubble = all[all.length - 1] ?? null;
  });

const waitForNewBubble = (page: Page) =>
  page.waitForFunction(
    () => {
      const all = document.querySelectorAll('[data-part="scroller"] article');
      const last = all[all.length - 1];
      return last && last !== (window as any).__benchLastBubble;
    },
    undefined,
    { timeout: 30_000 },
  );

const selectTab = async (page: Page, label: string) => {
  const tab = rightSidebar(page).getByRole("tab", { name: label, exact: true });
  if ((await tab.getAttribute("aria-selected")) !== "true") {
    await tab.click();
  }
};

const hasCards = async (page: Page) =>
  (await rightSidebar(page).getByRole("tab", { name: "Cards" }).count()) > 0;

const drawButton = (page: Page) =>
  rightSidebar(page).getByRole("button", { name: "Draw", exact: true }).first();

/** Fills the room history up so every run renders a full buffer. */
const seedHistory = async (page: Page) => {
  const count = await bubbles(page).count();
  if (count >= HISTORY_TARGET) return;
  console.log(`  seeding room history (${count} -> ${HISTORY_TARGET})`);
  const textarea = page.locator('textarea[placeholder="Chat"]');
  for (let i = count; i < HISTORY_TARGET; i++) {
    await markLastBubble(page);
    if (i % 3 === 0) {
      await selectTab(page, "Roll dice");
      await rollButton(page).click();
    } else {
      await textarea.fill(
        `Seed message ${i}: some **markdown** and a bit of _chatter_ to render`,
      );
      await textarea.press("Enter");
    }
    await waitForNewBubble(page);
  }
};

// ---------------------------------------------------------------------------
// scenarios

type Session = {
  context: BrowserContext;
  page: Page;
  cdp: CDPSession;
  otherPage: Page;
  cards: boolean;
};

type Scenario = {
  name: string;
  description: string;
  needsCards?: boolean;
  run: (session: Session) => Promise<Sample>;
};

const CHAT_TEXT = "The quick brown fox jumps over the lazy dog";

const scenarios: Scenario[] = [
  {
    name: "load",
    description: "open the room in a fresh tab until caught up and idle",
    run: async ({ context }) => {
      const { page, cdp } = await openPage(context);
      const before = await getCdpMetrics(cdp);
      await page.goto(ROOM_URL);
      await waitForRoomReady(page, HISTORY_TARGET);
      const after = await getCdpMetrics(cdp);
      const commits: CommitRecord[] = await page.evaluate(
        () => (window as any).__bench.commits,
      );
      await page.close();
      return summarise(commits, before, after);
    },
  },
  {
    name: "roll",
    description: "click Roll and wait for the result to land in chat",
    run: async ({ page, cdp }) => {
      await selectTab(page, "Roll dice");
      await waitForQuiet(page);
      await markLastBubble(page);
      return measure(page, cdp, async () => {
        await rollButton(page).click();
        await waitForNewBubble(page);
      });
    },
  },
  {
    name: "draw",
    description: "click Draw on the first deck and wait for the card in chat",
    needsCards: true,
    run: async ({ page, cdp }) => {
      await selectTab(page, "Cards");
      const button = drawButton(page);
      await button.waitFor();
      // A dwindling deck runs out eventually; put the cards back unmeasured.
      if (await button.isDisabled()) {
        await button
          .locator("xpath=ancestor::li")
          .getByRole("button", { name: "Reset" })
          .click();
        await page.waitForFunction(
          (element) =>
            !(element instanceof HTMLButtonElement && element.disabled),
          await button.elementHandle(),
        );
      }
      await waitForQuiet(page);
      await markLastBubble(page);
      return measure(page, cdp, async () => {
        await button.click();
        await waitForNewBubble(page);
      });
    },
  },
  {
    name: "receive",
    description: "another participant rolls; measured on this participant",
    run: async ({ page, cdp, otherPage }) => {
      await selectTab(otherPage, "Roll dice");
      await waitForQuiet(page);
      await markLastBubble(page);
      return measure(page, cdp, async () => {
        await rollButton(otherPage).click();
        await waitForNewBubble(page);
      });
    },
  },
  {
    name: "type",
    description: `type "${CHAT_TEXT}" into the chat box`,
    run: async ({ page, cdp }) => {
      const textarea = page.locator('textarea[placeholder="Chat"]');
      await textarea.fill("");
      await textarea.focus();
      await waitForQuiet(page);
      const sample = await measure(page, cdp, async () => {
        await page.keyboard.type(CHAT_TEXT);
      });
      await textarea.fill("");
      return sample;
    },
  },
  {
    name: "send",
    description: "press Enter on a typed chat message until it's in chat",
    run: async ({ page, cdp }) => {
      const textarea = page.locator('textarea[placeholder="Chat"]');
      await textarea.fill(CHAT_TEXT);
      await waitForQuiet(page);
      await markLastBubble(page);
      return measure(page, cdp, async () => {
        await textarea.press("Enter");
        await waitForNewBubble(page);
      });
    },
  },
  {
    name: "rollForm",
    description: "change die size, dice count and modifier in the roll form",
    run: async ({ page, cdp }) => {
      await selectTab(page, "Roll dice");
      const sidebar = rightSidebar(page);
      await waitForQuiet(page);
      const sample = await measure(page, cdp, async () => {
        for (const die of ["d20", "d8", "d6"]) {
          await sidebar
            .locator("label", {
              has: page.getByRole("radio", { name: die, exact: true }),
            })
            .click();
        }
        for (const label of [
          "Increase Number of dice",
          "Increase Modifier value",
        ]) {
          await sidebar.getByRole("button", { name: label }).click();
        }
      });
      await sidebar.getByRole("button", { name: "Reset" }).click();
      return sample;
    },
  },
  {
    name: "switchTab",
    description: "switch the right sidebar between tabs and back",
    run: async ({ page, cdp, cards }) => {
      await selectTab(page, "Roll dice");
      await waitForQuiet(page);
      const other = cards ? "Cards" : "Help";
      return measure(page, cdp, async () => {
        await selectTab(page, other);
        await selectTab(page, "Roll dice");
      });
    },
  },
];

const selectedScenarios = args.scenarios
  ? scenarios.filter(({ name }) => args.scenarios!.split(",").includes(name))
  : scenarios;

// ---------------------------------------------------------------------------
// orchestration

type Results = Record<string, Record<string, Sample[]>>;

const benchmarkVariant = async (
  browser: Browser,
  variant: string,
  results: Results,
) => {
  await startServer(variant);
  try {
    const newContext = async () => {
      const context = await browser.newContext({ viewport: VIEWPORT });
      await context.addInitScript(installReactCommitRecorder);
      return context;
    };
    const context = await newContext();
    const otherContext = await newContext();
    const { page, cdp } = await openPage(context);
    const otherPage = await otherContext.newPage();
    await Promise.all([page.goto(ROOM_URL), otherPage.goto(ROOM_URL)]);
    await waitForRoomReady(page, 1);
    await waitForRoomReady(otherPage, 1);
    await seedHistory(otherPage);
    await waitForRoomReady(page, HISTORY_TARGET);

    const cards = await hasCards(page);
    if (!cards) console.log("  no Cards tab in this room; skipping draw");

    const session: Session = { context, page, cdp, otherPage, cards };
    for (const scenario of selectedScenarios) {
      if (scenario.needsCards && !cards) continue;
      // one unmeasured pass to warm up caches and the JIT
      await scenario.run(session);
      for (let i = 0; i < ITERATIONS; i++) {
        const sample = await scenario.run(session);
        ((results[variant] ??= {})[scenario.name] ??= []).push(sample);
      }
      console.log(`  ${scenario.name}: done`);
    }
    await context.close();
    await otherContext.close();
  } finally {
    await stopServer();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const METRICS = [
  ["commits", "commits"],
  ["renders", "component renders"],
  ["reactRenderMs", "React render ms"],
  ["scriptMs", "script ms"],
  ["taskMs", "main-thread task ms"],
] as const;

const TOP_COMPONENTS = 12;

const report = (results: Results) => {
  const [baseline, candidate] = VARIANTS;
  const lines: string[] = [
    `# React Compiler render benchmarks`,
    "",
    `- date: ${new Date().toISOString()}`,
    `- CPU throttling: ${CPU_THROTTLE}x, viewport ${VIEWPORT.width}x${VIEWPORT.height}`,
    `- ${ROUNDS} round(s) x ${ITERATIONS} iteration(s) per variant, medians shown`,
    `- React profiling build; compiler ${baseline} vs ${candidate}`,
    "",
  ];
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const change = (a: number, b: number) =>
    a === 0 ? "–" : `${b >= a ? "+" : ""}${(((b - a) / a) * 100).toFixed(0)}%`;

  lines.push(
    `| scenario | metric | compiler ${baseline} | compiler ${candidate} | change |`,
    "| --- | --- | ---: | ---: | ---: |",
  );
  for (const scenario of selectedScenarios) {
    const a = results[baseline]?.[scenario.name];
    const b = results[candidate]?.[scenario.name];
    if (!a || !b) continue;
    for (const [key, label] of METRICS) {
      const ma = median(a.map((s) => s[key]));
      const mb = median(b.map((s) => s[key]));
      lines.push(
        `| ${scenario.name} | ${label} | ${fmt(ma)} | ${fmt(mb)} | ${change(ma, mb)} |`,
      );
    }
  }

  lines.push("", "## Components re-rendered per iteration", "");
  for (const scenario of selectedScenarios) {
    const a = results[baseline]?.[scenario.name];
    const b = results[candidate]?.[scenario.name];
    if (!a || !b) continue;
    const perIteration = (samples: Sample[]) => {
      const totals: Record<string, number> = {};
      for (const sample of samples) {
        for (const [name, count] of Object.entries(sample.rendered)) {
          totals[name] = (totals[name] ?? 0) + count / samples.length;
        }
      }
      return totals;
    };
    const ra = perIteration(a);
    const rb = perIteration(b);
    const names = [...new Set([...Object.keys(ra), ...Object.keys(rb)])]
      .sort(
        (x, y) => (ra[y] ?? 0) - (ra[x] ?? 0) || (rb[y] ?? 0) - (rb[x] ?? 0),
      )
      .slice(0, TOP_COMPONENTS);
    lines.push(
      `### ${scenario.name}: ${scenario.description}`,
      "",
      `| component | ${baseline} | ${candidate} |`,
      "| --- | ---: | ---: |",
      ...names.map(
        (name) => `| ${name} | ${fmt(ra[name] ?? 0)} | ${fmt(rb[name] ?? 0)} |`,
      ),
      "",
    );
  }
  return lines.join("\n");
};

const CDP_PORT = 9333;

const launchBrowser = async (): Promise<Browser> => {
  if (!args.flatpak) {
    return chromium.launch({ headless: !args.headed });
  }
  spawn(
    "flatpak",
    [
      "run",
      args.flatpak,
      ...(args.headed ? [] : ["--headless=new"]),
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${path.join(ROOT, "bench/.builds/chrome-profile")}`,
      "--no-first-run",
      "about:blank",
    ],
    { stdio: "ignore", detached: true },
  ).unref();
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      return await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`could not connect to ${args.flatpak}`);
};

const closeBrowser = async (browser: Browser) => {
  if (args.flatpak) {
    const session = await browser.newBrowserCDPSession();
    await session.send("Browser.close").catch(() => {});
  }
  await browser.close();
};

const main = async () => {
  const originalRedirect = await readFile(WRANGLER_REDIRECT, "utf8").catch(
    () => null,
  );
  try {
    if (!args["skip-build"]) {
      for (const variant of VARIANTS) await build(variant);
    }
    await runRounds();
  } finally {
    if (originalRedirect !== null) {
      await writeFile(WRANGLER_REDIRECT, originalRedirect);
    }
  }
};

const runRounds = async () => {
  const browser = await launchBrowser();
  const results: Results = {};
  try {
    for (let round = 0; round < ROUNDS; round++) {
      // alternate the order each round so drift doesn't favour one variant
      const order = round % 2 ? [...VARIANTS].reverse() : VARIANTS;
      for (const variant of order) {
        console.log(`round ${round + 1}: compiler=${variant}`);
        await benchmarkVariant(browser, variant, results);
      }
    }
  } finally {
    await closeBrowser(browser);
  }

  const outDir = path.join(ROOT, "bench/results");
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const markdown = report(results);
  await writeFile(
    path.join(outDir, `${stamp}.json`),
    JSON.stringify({ args, results }, null, 2),
  );
  await writeFile(path.join(outDir, `${stamp}.md`), markdown);
  console.log(`\n${markdown}`);
};

await main();
