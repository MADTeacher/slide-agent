import fs from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'

const outputDir = './output'

function newestEntry(entries) {
  return entries
    .map(name => ({
      name,
      mtimeMs: fs.statSync(path.join(outputDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.name ?? null
}

function detectLatestPdf() {
  const pdfs = fs.readdirSync(outputDir)
    .filter(name => name.endsWith('.pdf'))
  return newestEntry(pdfs)
}

function detectLatestPngDir() {
  const dirs = fs.readdirSync(outputDir)
    .filter(name => {
      const fullPath = path.join(outputDir, name)
      return fs.statSync(fullPath).isDirectory()
        && fs.readdirSync(fullPath).some(file => /^\d+\.png$/.test(file))
    })
  return newestEntry(dirs)
}

async function fixPdf(filename) {
  const filepath = path.join(outputDir, filename)
  if (!fs.existsSync(filepath)) {
    console.log(`PDF not found: ${filepath}`)
    return
  }
  const bytes = fs.readFileSync(filepath)
  const pdf = await PDFDocument.load(bytes)
  if (pdf.getPageCount() > 1) {
    pdf.removePage(0)
    const saved = await pdf.save()
    fs.writeFileSync(filepath, saved)
    console.log(`Fixed PDF: removed blank first page -> ${filepath} (pages: ${pdf.getPageCount()})`)
  } else {
    console.log(`PDF has only 1 page, skipping: ${filepath}`)
  }
}

function fixPng(dirName) {
  const dir = path.join(outputDir, dirName)
  if (!fs.existsSync(dir)) {
    console.log(`PNG directory not found: ${dir}`)
    return
  }
  const files = fs.readdirSync(dir)
    .filter(f => /^\d+\.png$/.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))

  if (files.length <= 1) {
    console.log(`Not enough PNGs to fix in ${dir}`)
    return
  }

  fs.unlinkSync(path.join(dir, '1.png'))

  for (let i = 2; i <= files.length; i++) {
    const oldPath = path.join(dir, `${i}.png`)
    const newPath = path.join(dir, `${i - 1}.png`)
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath)
    }
  }
  console.log(`Fixed PNGs in ${dir}: removed blank 1.png, shifted numbering (${files.length - 1} remaining)`)
}

async function main() {
  const args = process.argv.slice(2)
  const fixPdfFlag = args.includes('--pdf')
  const fixPngFlag = args.includes('--png')

  const latestPdf = detectLatestPdf()
  const latestPngDir = detectLatestPngDir()

  if (fixPdfFlag) {
    if (!latestPdf) {
      console.log('No PDF export found to fix.')
    } else {
      await fixPdf(latestPdf)
    }
  }

  if (fixPngFlag) {
    if (!latestPngDir) {
      console.log('No PNG export directory found to fix.')
    } else {
      fixPng(latestPngDir)
    }
  }

  if (!fixPdfFlag && !fixPngFlag) {
    if (latestPdf) await fixPdf(latestPdf)
    if (latestPngDir) fixPng(latestPngDir)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
