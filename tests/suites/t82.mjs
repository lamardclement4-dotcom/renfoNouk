// Trusted Types : la politique « default » n autorise que les scripts du site
// lui-meme (service worker, moteur OCR). Tout le reste est refuse.
import { urlDeScriptAutorisee } from '../../src/typesDeConfiance.js'
import { readFileSync } from 'node:fs'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const O = 'https://lamardclement4-dotcom.github.io', B = '/renfoNouk/'
const ok = (u) => urlDeScriptAutorisee(u, B, O)
a(ok(B + 'sw.js') === O + B + 'sw.js', 'le service worker du site est autorise')
a(ok(O + B + 'ocr/worker.min.js') && ok(B + 'ocr/tesseract-core-simd-lstm.wasm.js'), 'le worker et le coeur du moteur OCR aussi')
a(ok('https://cdn.jsdelivr.net/npm/tesseract.js/dist/worker.min.js') === null, 'un CDN tiers est refuse')
a(ok('https://evil.github.io' + B + 'sw.js') === null, 'meme nom de fichier sur une autre origine : refuse')
a(ok(B + 'assets/index.js') === null && ok(B + 'ocr/fra.traineddata.gz') === null, 'aucun autre fichier du site comme script')
a(ok('javascript:alert(1)') === null && ok('data:text/javascript,alert(1)') === null && ok('blob:' + O + '/x') === null, 'javascript:, data: et blob: refuses')
a(ok(B + 'ocr/../evil.js') === null, 'remontee de chemin neutralisee (URL normalisee avant controle)')
const entree = readFileSync('../../src/main.jsx', 'utf8')
a(entree.indexOf("import './typesDeConfiance'") < entree.indexOf("from 'react'"), 'la politique est chargee avant tout autre code')
console.log('\nALL PASS')
