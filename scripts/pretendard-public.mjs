// Pretendard dynamic subset(CSS + woff2)을 public/fonts/pretendard-<버전>/ 으로 복사한다 (P1-5, D-32).
// 글꼴을 번들 CSS 에서 빼고 첫 화면 뒤에 따로 불러오기 위해서다(components/layout/DeferredFonts.tsx).
// predev·prebuild 에서 실행된다. 결과물은 커밋하지 않는다(.gitignore).
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("pretendard/package.json");
const src = "node_modules/pretendard/dist/web/variable";
const dest = `public/fonts/pretendard-${version}`;

if (!existsSync(`${dest}/pretendard.css`)) {
  mkdirSync(dest, { recursive: true });
  cpSync(`${src}/pretendardvariable-dynamic-subset.css`, `${dest}/pretendard.css`);
  cpSync(`${src}/woff2-dynamic-subset`, `${dest}/woff2-dynamic-subset`, { recursive: true });
}
console.log(`pretendard ${version} → ${dest}`);
