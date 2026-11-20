import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GalleryError,
  assertSectionIsValid,
  assertTitleIsValid,
  detectImageType,
} from '../../src/domain/gallery/gallery-rules'

test('un titre d’album est nettoyé des espaces autour', () => {
  assert.equal(assertTitleIsValid('  Sortie Ventoux  '), 'Sortie Ventoux')
})

test('un titre vide ou fait d’espaces est refusé', () => {
  assert.throws(() => assertTitleIsValid('   '), { code: 'ALBUM_TITLE_REQUIRED' })
  assert.throws(() => assertTitleIsValid(undefined), { code: 'ALBUM_TITLE_REQUIRED' })
})

test('un titre de plus de 255 caractères est refusé', () => {
  assert.throws(() => assertTitleIsValid('a'.repeat(256)), { code: 'ALBUM_TITLE_TOO_LONG' })
  assert.equal(assertTitleIsValid('a'.repeat(255)).length, 255)
})

test('seules les sections velo et five sont acceptées', () => {
  assert.equal(assertSectionIsValid('velo'), 'velo')
  assert.equal(assertSectionIsValid('five'), 'five')
  assert.throws(() => assertSectionIsValid('foot'), GalleryError)
})

test('un JPEG est reconnu par ses premiers octets', () => {
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])), 'jpg')
})

test('un PNG est reconnu par sa signature', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  assert.equal(detectImageType(png), 'png')
})

test('un WebP est reconnu par RIFF....WEBP', () => {
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])
  assert.equal(detectImageType(webp), 'webp')
})

test('un fichier qui n’est pas une image autorisée renvoie null', () => {
  assert.equal(detectImageType(Buffer.from('%PDF-1.7')), null)
  assert.equal(detectImageType(Buffer.alloc(0)), null)
})
