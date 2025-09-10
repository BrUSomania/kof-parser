import { kof } from '../src/kof';
import fs from 'fs';

const kofFile = fs.readFileSync('./demo/kof-files/sample.kof', 'utf-8');
const result = kof.parse(kofFile);
console.log('Parsed KOF:', result);
