import { test } from 'node:test'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('entry is valid JavaScript', () => {
  execFileSync('node', ['--check', join(root, 'index.js')])
})
