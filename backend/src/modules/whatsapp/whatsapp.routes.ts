import { Router } from 'express';
import { whatsAppController } from './whatsapp.controller';
import { adminAuthGuard } from '../../middleware/adminAuthGuard';

const router = Router();

// Require admin authentication for WhatsApp management endpoints
router.use(adminAuthGuard as any);

router.get('/status', (req, res) => whatsAppController.getStatus(req, res));
router.get('/qr', (req, res) => whatsAppController.getQr(req, res));
router.post('/connect', (req, res) => whatsAppController.connect(req, res));
router.post('/disconnect', (req, res) => whatsAppController.disconnect(req, res));
router.post('/send-test', (req, res) => whatsAppController.sendTestMessage(req, res));

export default router;
