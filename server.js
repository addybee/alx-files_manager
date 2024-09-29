import expess from 'express';
import router from './routes/index';

const port = process.env.PORT || 5000;
const app = expess();

app.use(router);

app.listen(port);
