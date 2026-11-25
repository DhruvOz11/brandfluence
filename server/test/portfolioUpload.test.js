const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { hasValidFileSignature } = require('../utils/portfolioUpload');

test('accepts a supported image with a matching file signature', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'brandfluence-media-'));
  const filePath = path.join(directory, 'portfolio.png');
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

  try {
    await fs.writeFile(filePath, pngHeader);
    assert.equal(
      await hasValidFileSignature({ path: filePath, mimetype: 'image/png' }),
      true
    );
    assert.equal(
      await hasValidFileSignature({ path: filePath, mimetype: 'image/jpeg' }),
      false
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
