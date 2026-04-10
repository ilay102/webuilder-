import fs from 'fs';
import { exec } from 'child_process';

const QUEUE_PATH = '/root/.openclaw/workspace/demo_queue.json';

console.log('👀 Carti Watcher is ACTIVE (Git-Safe Edition)');

fs.watchFile(QUEUE_PATH, (curr, prev) => {
  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));
  const pending = queue.find((item: any) => item.status === 'pending');

  if (pending) {
    console.log(`🚀 Starting build for: ${pending.phone}`);
    pending.status = 'building';
    fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));

    // מוודא סנכרון לפני ואחרי הבנייה
    const buildCmd = \`git pull origin main && npx ts-node /root/webuilder/scripts/new-demo.ts --phone "\${pending.phone}"\`;
    
    exec(buildCmd, (err, stdout, stderr) => {
      if (err) console.error('❌ Build failed:', stderr);
      else console.log('✅ Build & Push complete!');
      
      // איפוס התור אחרי סיום (או כשלון) כדי לא להיתקע בלופ
      const finalQueue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));
      const updated = finalQueue.filter((i: any) => i.phone !== pending.phone);
      fs.writeFileSync(QUEUE_PATH, JSON.stringify(updated, null, 2));
    });
  }
});
