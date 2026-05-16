const fs = require("fs");
const path = require("path");

const base = path.join(__dirname, "../node_modules/next-english-node/dist");

const replacements = [
  { file: "index.esm.js", old: '"/quiz"===t?J():(i.push(t),S(t))', neu: "(i.push(t),S(t))" },
  { file: "index.cjs.js", old: '"/quiz"===A?J():(r.push(A),S(A))', neu: "(r.push(A),S(A))" },
];

for (const { file, old, neu } of replacements) {
  const p = path.join(base, file);
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes(old)) {
    console.log(`${file}: already patched or unknown bundle — skip`);
    continue;
  }
  const count = s.split(old).length - 1;
  console.log(`${file}: replacements ${count}`);
  s = s.split(old).join(neu);
  fs.writeFileSync(p, s);
}
