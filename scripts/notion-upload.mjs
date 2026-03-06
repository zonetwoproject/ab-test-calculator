#!/usr/bin/env node
/**
 * MDE 문서를 Notion 페이지로 업로드합니다.
 * 사용법: NOTION_API_KEY=xxx NOTION_PARENT_PAGE_ID=xxx npm run notion:upload
 */

import { Client } from "@notionhq/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, "..", "docs");

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!NOTION_API_KEY || !NOTION_PARENT_PAGE_ID) {
  console.error("필요한 환경 변수: NOTION_API_KEY, NOTION_PARENT_PAGE_ID");
  console.error("Notion 연동: https://www.notion.so/my-integrations 에서 Integration 생성 후");
  console.error("부모로 쓸 페이지를 열고 연동(Connections)에 추가한 뒤, 페이지 ID를 넣으세요.");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

function richText(content) {
  const text = (content || "")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim()
    .slice(0, 2000);
  return [{ type: "text", text: { content: text } }];
}

function parseTableLines(lines) {
  const rows = [];
  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1);
    if (cells.length === 0) continue;
    if (cells.every((c) => /^[-:]+$/.test(c))) continue;
    rows.push(cells);
  }
  return rows;
}

function tableToNotionBlocks(rows, tableWidth) {
  if (rows.length === 0) return [];
  const tableRows = rows.map((cells) => ({
    type: "table_row",
    table_row: {
      cells: (cells.length >= tableWidth ? cells.slice(0, tableWidth) : [...cells, ...Array(tableWidth - cells.length).fill("")]).map(
        (cell) => ({ type: "text", text: { content: (cell || "").slice(0, 2000) } })
      ),
    },
  }));
  return [
    {
      type: "table",
      table: {
        table_width: tableWidth,
        has_column_header: true,
        has_row_header: false,
        children: tableRows,
      },
    },
  ];
}

function parseMarkdown(content) {
  const lines = content.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("# ")) {
      blocks.push({ type: "heading_1", text: line.replace(/^#\s+/, "") });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "heading_2", text: line.replace(/^##\s+/, "") });
      i++;
      continue;
    }
    if (line.trim() === "---") {
      i++;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = parseTableLines(tableLines);
      if (rows.length > 0) {
        blocks.push({ type: "table", rows, tableWidth: rows[0].length });
      }
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() !== "---" && !lines[i].trim().startsWith("|") && !lines[i].startsWith("#")) {
      if (lines[i].trim()) para.push(lines[i].trim());
      i++;
    }
    if (para.length > 0) {
      blocks.push({ type: "paragraph", text: para.join(" ") });
    }
    if (i < lines.length && lines[i].trim() === "") i++;
  }

  return blocks;
}

function mdBlocksToNotionChildren(mdBlocks) {
  const children = [];
  for (const b of mdBlocks) {
    if (b.type === "heading_1") {
      children.push({ type: "heading_1", heading_1: { rich_text: richText(b.text) } });
    } else if (b.type === "heading_2") {
      children.push({ type: "heading_2", heading_2: { rich_text: richText(b.text) } });
    } else if (b.type === "paragraph") {
      if (b.text) children.push({ type: "paragraph", paragraph: { rich_text: richText(b.text) } });
    } else if (b.type === "table") {
      const tableRows = b.rows.map((cells) => ({
        type: "table_row",
        table_row: {
          cells: (cells.length >= b.tableWidth ? cells.slice(0, b.tableWidth) : [...cells, ...Array(b.tableWidth - cells.length).fill("")]).map(
            (cell) => ({ type: "text", text: { content: (String(cell) || "").slice(0, 2000) } })
          ),
        },
      }));
      children.push({
        type: "table",
        table: {
          table_width: b.tableWidth,
          has_column_header: true,
          has_row_header: false,
          children: tableRows,
        },
      });
    }
  }
  return children;
}

async function createNotionPage(title, children) {
  const body = {
    parent: { type: "page_id", page_id: NOTION_PARENT_PAGE_ID.trim() },
    properties: {
      title: {
        title: [{ type: "text", text: { content: title.slice(0, 2000) } }],
      },
    },
    children,
  };
  return notion.pages.create(body);
}

async function main() {
  const mdeTableRaw = readFileSync(join(DOCS_DIR, "mde-by-sample-size.md"), "utf8");
  const guideRaw = readFileSync(join(DOCS_DIR, "mde-meaningfulness-guide.md"), "utf8");

  const mdeTitle = "실험 기간 2주 고정 · 샘플 수별 최소 검출 가능 개선률 (MDE)";
  const mdeBlocks = parseMarkdown(mdeTableRaw);
  const mdeChildren = mdBlocksToNotionChildren(mdeBlocks);

  const guideTitle = "통계 관점: 지면 규모별 “의미 있는 실험” 기준";
  const guideBlocks = parseMarkdown(guideRaw);
  const guideChildren = mdBlocksToNotionChildren(guideBlocks);

  console.log("Notion 페이지 생성 중...");
  const [page1, page2] = await Promise.all([
    createNotionPage(mdeTitle, mdeChildren),
    createNotionPage(guideTitle, guideChildren),
  ]);
  console.log("생성 완료:");
  console.log("  1. MDE 표:", page1.url);
  console.log("  2. 의미 있는 실험 기준:", page2.url);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
