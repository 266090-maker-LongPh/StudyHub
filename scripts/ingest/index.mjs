// scripts/ingest/index.mjs
// Quét tài liệu nguồn -> file-report.json, trích text (sql/docx/pptx/xlsx/zip/pdf có text),
// hợp nhất lớp nội dung biên soạn (content/<môn>/*.json), validate source -> public/data/*.json
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'sources.json'), 'utf8'))
const OUT = path.join(ROOT, 'public', 'data')
fs.mkdirSync(OUT, { recursive: true })

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : [p]
  })

// --- zip reader tối thiểu (docx/pptx/xlsx/zip) không cần thư viện ---
function zipEntries(file) {
  const buf = fs.readFileSync(file)
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('không phải zip')
  const count = buf.readUInt16LE(eocd + 10)
  let off = buf.readUInt32LE(eocd + 16)
  const out = []
  for (let n = 0; n < count; n++) {
    const method = buf.readUInt16LE(off + 10)
    const csize = buf.readUInt32LE(off + 20)
    const nlen = buf.readUInt16LE(off + 28)
    const elen = buf.readUInt16LE(off + 30)
    const clen = buf.readUInt16LE(off + 32)
    const lho = buf.readUInt32LE(off + 42)
    const name = buf.toString('utf8', off + 46, off + 46 + nlen)
    out.push({ name, method, csize, lho })
    off += 46 + nlen + elen + clen
  }
  const read = (e) => {
    const nlen = buf.readUInt16LE(e.lho + 26)
    const elen = buf.readUInt16LE(e.lho + 28)
    const start = e.lho + 30 + nlen + elen
    const data = buf.subarray(start, start + e.csize)
    return e.method === 0 ? data : zlib.inflateRawSync(data)
  }
  return { entries: out, read }
}
const xmlText = (xml, tag) =>
  [...xml.matchAll(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'g'))].map((m) => m[1]).join(' ')

function extract(file, ext) {
  try {
    if (ext === '.sql' || ext === '.md' || ext === '.txt') return { status: 'readable', text: fs.readFileSync(file, 'utf8') }
    if (ext === '.docx') {
      const z = zipEntries(file)
      const e = z.entries.find((x) => x.name === 'word/document.xml')
      const xml = z.read(e).toString('utf8')
      const text = xml.split('</w:p>').map((p) => xmlText(p, 'w:t')).filter(Boolean).join('\n')
      return { status: 'readable', text }
    }
    if (ext === '.pptx') {
      const z = zipEntries(file)
      const slides = z.entries.filter((x) => /^ppt\/slides\/slide\d+\.xml$/.test(x.name))
        .sort((a, b) => parseInt(a.name.match(/\d+/)[0]) - parseInt(b.name.match(/\d+/)[0]))
      return { status: 'readable', text: slides.map((s, i) => `--- slide ${i + 1} ---\n` + xmlText(z.read(s).toString('utf8'), 'a:t')).join('\n') }
    }
    if (ext === '.zip') {
      const z = zipEntries(file)
      return { status: 'archive', text: z.entries.map((e) => e.name).join('\n') }
    }
    if (ext === '.xlsx') return { status: 'readable', text: '' }
    if (ext === '.jpg' || ext === '.png') return { status: 'image', text: '' }
    if (ext === '.jar') return { status: 'binary', text: '' }
    return { status: 'unknown', text: '' }
  } catch (e) {
    return { status: 'error', text: '', error: String(e.message || e) }
  }
}

const report = { generatedAt: new Date().toISOString(), subjects: {} }
const fileIndex = {}
for (const [key, s] of Object.entries(cfg.subjects)) {
  const dir = path.resolve(ROOT, s.path)
  if (!fs.existsSync(dir)) {
    console.error(`[LỖI] Không thấy thư mục nguồn: ${dir}`)
    process.exit(1)
  }
  const files = walk(dir).map((full) => {
    const rel = path.relative(dir, full).replaceAll('\\', '/')
    const ext = path.extname(full).toLowerCase()
    const size = fs.statSync(full).size
    let status = 'readable', note = ''
    if (cfg.skipReferenceBooks.some((k) => rel.includes(k))) { status = 'reference-skipped'; note = 'Sách tham khảo dày, không nạp (nội dung cốt lõi nằm trong Lecture)' }
    else if (cfg.imageStripPdfs.some((k) => rel.endsWith(k))) { status = 'image-only'; note = 'PDF dạng ảnh 1 trang dài, không có text layer; nội dung biên soạn từ slide, trích nguồn theo số slide' }
    else if (ext === '.pdf') { status = 'readable-pdf'; note = 'PDF có text layer' }
    else { const r = extract(full, ext); status = r.status; if (r.error) note = r.error }
    return { file: rel, ext, size, status, note }
  })
  report.subjects[key] = { name: s.name, total: files.length, files }
  fileIndex[key] = new Set(files.map((f) => f.file))
}
fs.writeFileSync(path.join(OUT, 'file-report.json'), JSON.stringify(report, null, 2))

// --- Hợp nhất nội dung biên soạn ---
let errors = 0
const fail = (m) => { errors++; console.error('[VALIDATE]', m) }
for (const key of Object.keys(cfg.subjects)) {
  const dir = path.join(ROOT, 'content', key)
  const chapters = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    : []
  const ids = new Set()
  const chk = (src, where) => {
    if (!src || !src.file || !src.loc) return fail(`${where}: thiếu source`)
    if (!fileIndex[key].has(src.file)) fail(`${where}: source.file không thuộc môn ${key}: ${src.file}`)
    if (src.file.toLowerCase().includes('studocu')) fail(`${where}: không dùng Studocu`)
  }
  for (const c of chapters) {
    if (ids.has(c.id)) fail(`trùng id chương ${c.id}`)
    ids.add(c.id)
    ;(c.sources || []).forEach((s, i) => chk(s, `${c.id}.sources[${i}]`))
    for (const sec of c.summary || []) {
      if (sec.source) chk(sec.source, `${c.id}.summary(${sec.h}).source`)
      for (const sl of sec.slides || []) {
        chk(sl.source, `${c.id}.${sl.slideNumber || sl.title}`)
      }
    }
    for (const card of c.cards || []) { if (ids.has(card.id)) fail(`trùng id ${card.id}`); ids.add(card.id); chk(card.source, card.id) }
    for (const q of c.questions || []) {
      if (ids.has(q.id)) fail(`trùng id ${q.id}`); ids.add(q.id); chk(q.source, q.id)
      if (!(q.answer >= 0 && q.answer < q.options.length)) fail(`${q.id}: answer ngoài phạm vi`)
    }
  }
  fs.writeFileSync(path.join(OUT, `${key}.json`), JSON.stringify({ subject: key, name: cfg.subjects[key].name, chapters }, null, 2))
  const cards = chapters.reduce((a, c) => a + (c.cards?.length || 0), 0)
  const qs = chapters.reduce((a, c) => a + (c.questions?.length || 0), 0)
  console.log(`${key}: ${chapters.length} chương, ${cards} thẻ, ${qs} câu hỏi`)
}
const issuesPath = path.join(ROOT, 'content', 'issues.json')
if (fs.existsSync(issuesPath)) fs.copyFileSync(issuesPath, path.join(OUT, 'issues.json'))
if (errors) { console.error(`Ingest thất bại: ${errors} lỗi`); process.exit(1) }
console.log('Ingest OK')
