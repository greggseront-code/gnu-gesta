import { app } from './app';
import { getDb } from './db/db.connection';
import { loadAuthMode } from './features/auth/auth.config';

const PORT = process.env.PORT ?? '3000';
const HOST = process.env.HOST ?? (loadAuthMode() === 'dev' ? '127.0.0.1' : undefined);

getDb();

const onListening = () => {
  console.log(`Server running on http://localhost:${PORT}`);
};

if (HOST) {
  app.listen(Number(PORT), HOST, onListening);
} else {
  app.listen(Number(PORT), onListening);
}
