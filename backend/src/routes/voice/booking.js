// Mounts per-tool handlers. Each handler is a self-contained module in
// handlers/ — keeps this file small and makes future ports cleaner. Shared
// helpers (parseTireCount, isPerUnitService, getShopClosures, bay assignment,
// etc.) live in ./utils.js.
import { Router } from 'express';
import checkAvailability from './handlers/check-availability.js';
import bookAppointment from './handlers/book-appointment.js';
import modifyAppointment from './handlers/modify-appointment.js';
import sendConfirmation from './handlers/send-confirmation.js';

const router = Router();

router.post('/check_availability', checkAvailability);
router.post('/book_appointment', bookAppointment);
router.post('/modify_appointment', modifyAppointment);
router.post('/send_confirmation', sendConfirmation);

export default router;
