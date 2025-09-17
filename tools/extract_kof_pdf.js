const fs = require('fs');
const path = require('path');
const pdfPath = path.join(__dirname, '..', 'docs', 'KOF_format_dokumentasjon.pdf');
const pdf = require('pdf-parse');

const data = fs.readFileSync(pdfPath);
pdf(data).then(d => {
  const text = d.text;
  // Find two-digit codes like 05, 09, 10 at line starts or within text
  const codes = new Set();
  // match standalone two-digit numbers, or three-digit like 091, but focus 2-digit
  const re = /\b(0?\d|[1-9]\d)\b/g;
  let m;
  while ((m = re.exec(text)) !== null) codes.add(m[1].padStart(2,'0'));
  // Also catch patterns like '72..79' or '72–79'
  const rangeRe = /(\d{2})\s*(?:\.\.|–|-|—)\s*(\d{2})/g;
  while ((m = rangeRe.exec(text)) !== null) {
    const a = parseInt(m[1],10), b = parseInt(m[2],10);
    for (let i=a;i<=b;i++) codes.add(String(i).padStart(2,'0'));
  }
  const sorted = Array.from(codes).sort((a,b)=>parseInt(a,10)-parseInt(b,10));
  console.log('DOCUMENTED CODES FOUND IN PDF:\n');
  console.log(sorted.join(', '));
  // Also write full text to tmp file
  fs.writeFileSync(path.join(__dirname, '..','test','mocha','logs','KOF_doc_text.txt'), text, 'utf8');
  fs.writeFileSync(path.join(__dirname, '..','test','mocha','logs','KOF_doc_codes.txt'), sorted.join(', '), 'utf8');
}).catch(e=>{ console.error('ERROR', e); process.exit(2); });
