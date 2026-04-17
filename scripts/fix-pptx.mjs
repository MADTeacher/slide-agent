import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

const filepath = 'output/clothes-and-accessories-shopping.pptx'

async function fixPptx() {
  if (!fs.existsSync(filepath)) {
    console.log(`PPTX not found: ${filepath}`)
    return
  }

  const buffer = fs.readFileSync(filepath)
  const zip = await JSZip.loadAsync(buffer)

  // 1. Remove slide1.xml and its rels
  zip.remove('ppt/slides/slide1.xml')
  zip.remove('ppt/slides/_rels/slide1.xml.rels')

  // 2. Rename remaining slides
  const slideFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)[1], 10)
      const nb = parseInt(b.match(/slide(\d+)\.xml/)[1], 10)
      return na - nb
    })

  for (const oldPath of slideFiles) {
    const num = parseInt(oldPath.match(/slide(\d+)\.xml/)[1], 10)
    const newPath = `ppt/slides/slide${num - 1}.xml`
    if (num > 1 && zip.files[oldPath]) {
      const content = await zip.file(oldPath).async('string')
      zip.file(newPath, content)
      zip.remove(oldPath)
    }
  }

  // 3. Rename remaining rels
  const relsFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml\.rels/)[1], 10)
      const nb = parseInt(b.match(/slide(\d+)\.xml\.rels/)[1], 10)
      return na - nb
    })

  for (const oldPath of relsFiles) {
    const num = parseInt(oldPath.match(/slide(\d+)\.xml\.rels/)[1], 10)
    const newPath = `ppt/slides/_rels/slide${num - 1}.xml.rels`
    if (num > 1 && zip.files[oldPath]) {
      const content = await zip.file(oldPath).async('string')
      zip.file(newPath, content)
      zip.remove(oldPath)
    }
  }

  // 4. Fix [Content_Types].xml
  const contentTypes = await zip.file('[Content_Types].xml').async('string')
  let fixedContentTypes = contentTypes
    .replace(/<Override PartName="\/ppt\/slides\/slide1\.xml"[^>]*>\s*/g, '')
  for (let i = 2; i <= slideFiles.length + 1; i++) {
    fixedContentTypes = fixedContentTypes.replace(
      new RegExp(`slide${i}.xml`, 'g'),
      `slide${i - 1}.xml`
    )
  }
  zip.file('[Content_Types].xml', fixedContentTypes)

  // 5. Fix presentation.xml.rels
  const presRels = await zip.file('ppt/_rels/presentation.xml.rels').async('string')
  let fixedPresRels = presRels
    .replace(/<Relationship[^>]*Target="slides\/slide1\.xml"[^>]*>\s*/g, '')
  for (let i = 2; i <= slideFiles.length + 1; i++) {
    fixedPresRels = fixedPresRels.replace(
      new RegExp(`slide${i}.xml`, 'g'),
      `slide${i - 1}.xml`
    )
  }
  zip.file('ppt/_rels/presentation.xml.rels', fixedPresRels)

  // 6. Fix presentation.xml — remove first sldId
  const pres = await zip.file('ppt/presentation.xml').async('string')
  const sldIdLstMatch = pres.match(/<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/)
  if (sldIdLstMatch) {
    const sldIds = sldIdLstMatch[1].match(/<p:sldId[^>]*\/>/g) || []
    if (sldIds.length > 1) {
      sldIds.shift() // remove first
      const newSldIdLst = `<p:sldIdLst>${sldIds.join('')}</p:sldIdLst>`
      const fixedPres = pres.replace(sldIdLstMatch[0], newSldIdLst)
      zip.file('ppt/presentation.xml', fixedPres)
    }
  }

  // 7. Save
  const newBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  fs.writeFileSync(filepath, newBuffer)
  console.log(`Fixed PPTX: removed blank first slide -> ${filepath} (slides: ${slideFiles.length})`)
}

fixPptx().catch(err => {
  console.error(err)
  process.exit(1)
})
