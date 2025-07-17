import fs from "fs/promises";
import { htmlToText } from "html-to-text";

const title = process.env.WIKI_TITLE_NAME;
const url = `https://ja.wikipedia.org/wiki/${title}`;

const response = await fetch(url);
const html = await response.text();

const text = htmlToText(html, {
  ignoreHref: true,
  ignoreImage: true,
  selectors: [
    { selector: ".mw-body-content", format: "block" }
  ]
});

await fs.mkdir("assets", { recursive: true });
await fs.writeFile(`assets/${title}.txt`, text);
