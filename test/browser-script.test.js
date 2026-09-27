const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

test("embedded React application script is valid JavaScript", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "biswokarma-workshop (1).html"),
    "utf8",
  );
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0, "expected an inline application script");
  assert.doesNotThrow(() => new Function(scripts[scripts.length - 1][1]));
});
