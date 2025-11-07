import { Hono } from 'hono';
import { auth } from './routes/auth';
import { withCORS } from './lib/cors';

const app = new Hono();

app.use('*', withCORS());
app.route('/auth', auth);

app.get('/', c => c.text('AuthKit API'));

export default app;
