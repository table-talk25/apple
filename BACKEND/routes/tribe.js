const express = require('express');
const tribeController = require('../controllers/tribeController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, tribeController.getMyTribe);
router.post('/invites', protect, tribeController.sendInvite);
router.post('/invites/:id/accept', protect, tribeController.acceptInvite);
router.post('/invites/:id/decline', protect, tribeController.declineInvite);
router.delete('/invites/:id', protect, tribeController.cancelInvite);
router.delete('/members/:userId', protect, tribeController.removeMember);

router.get('/lists', protect, tribeController.getLists);
router.post('/lists', protect, tribeController.createList);
router.put('/lists/:id', protect, tribeController.updateList);
router.delete('/lists/:id', protect, tribeController.deleteList);

module.exports = router;
