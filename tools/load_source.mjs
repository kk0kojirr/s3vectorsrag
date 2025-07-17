import fs from "fs/promises";
import TurndownService from "turndown";
import * as cheerio from "cheerio";

const title = process.env.WIKI_TITLE_NAME;
const url = `https://ja.wikipedia.org/wiki/${title}`;

const response = await fetch(url);
const html = await response.text();

const $ = cheerio.load(html);
const bodyContent = $(".mw-body-content").html();

const turndownService = new TurndownService();

// リンクをテキストだけに
turndownService.addRule("plainLink", {
  filter: "a",
  replacement: function(content) {
    return content;
  }
});
// 画像を除去
turndownService.addRule("removeImage", {
  filter: "img",
  replacement: function() {
    return "";
  }
});

const markdown = turndownService.turndown(bodyContent);

// さらに [編集 ...] などのノイズを除去
const cleaned = markdown.replace(/\[[^\[\]\n]{1,100}\]/g, "");

await fs.mkdir("assets", { recursive: true });
await fs.writeFile(`assets/${title}.txt`, cleaned);
