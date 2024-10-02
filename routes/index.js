import { Router } from 'express';
import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';
import UsersController from '../controllers/UsersController';

const router = Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UsersController.postNew);
// GET /connect => AuthController.getConnect
router.get('/connect', AuthController.getConnect);
// GET /disconnect => AuthController.getDisconnect
router.get('/disconnect', AuthController.getDisconnect);
// GET /users/me => UserController.getMe
router.get('/users/me', UsersController.getMe);
// POST /files => FilesController.postUpload
router.post('/files', FilesController.postUpload);
// GET /files/:id => FilesController.getShow
router.get('/files/:id', FilesController.getShow);
// GET /files => FilesController.getIndex
router.get('/files', FilesController.getIndex);

export default router;
