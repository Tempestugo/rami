import https from 'https';

const SOURCE_URL = 'https://raw.githubusercontent.com/krmanik/Chinese-Example-Sentences/main/Chinese%20Example%20Sentences/cmn_sen_db_2.tsv';

console.log('Downloading sample from:', SOURCE_URL);

https.get(SOURCE_URL, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
    if (data.length > 5000) {
      res.destroy();
      printSample(data);
    }
  });
  res.on('end', () => {
    printSample(data);
  });
}).on('error', (e) => {
  console.error('Error downloading:', e);
});

function printSample(data) {
  const lines = data.split('\n');
  console.log('Total sample lines:', lines.length);
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    console.log(`Line ${i}:`, lines[i]);
  }
  process.exit();
}
