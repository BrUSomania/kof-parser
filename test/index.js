import { kof } from '../src/kof';

const kofString = 'KOF_HEADER\nDATA1;DATA2;DATA3\nEND\n';
const result = kof.parse(kofString);
console.log('Test result:', result);
