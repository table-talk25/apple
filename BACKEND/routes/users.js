const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { check } = require('express-validator');
const { upload, handleUploadError } = require('../middleware/upload');
// const { updateUserLocationFromCoords } = require('../controllers/userController');

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get('/', [
  protect,
  authorize('admin'),
  check('page', 'Page number must be a positive integer').optional().isInt({ min: 1 }),
  check('limit', 'Limit must be a positive integer').optional().isInt({ min: 1 })
], userController.getUsers);

/**
 * @route   GET /api/users/nearby
 * @desc    Get nearby users
 * @access  Private
 */
router.get('/nearby', protect, userController.getNearbyUsers);

/**
 * @route   GET /api/users/blocked
 * @desc    Get list of blocked users
 * @access  Private
 */
router.get('/blocked', protect, userController.getBlockedUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', [
  protect,
  check('id', 'ID utente non valido').isMongoId()
], userController.getUserById);


/**
 * @route   PUT /api/users/me/location
 * @desc    Update current user's location
 * @access  Private
 */
router.put('/me/location', [
  protect,
  check('latitude', 'La latitudine è obbligatoria').isFloat(),
  check('longitude', 'La longitudine è obbligatoria').isFloat()
], userController.updateUserLocation);

/**
 * @route   DELETE /api/users/me/location
 * @desc    Remove current user's location (when app closes)
 * @access  Private
 */
router.delete('/me/location', protect, userController.removeUserLocation);

/**
 * @route   POST /api/users/:id/block
 * @desc    Block a user (user-to-user blocking)
 * @access  Private
 */
router.post('/:id/block', [
  protect,
  check('id', 'ID utente non valido').isMongoId()
], userController.blockUser);


/**
 * @route   DELETE /api/users/:id/block
 * @desc    Unblock a user (user-to-user unblocking)
 * @access  Private
 */
router.delete('/:id/block', [
  protect,
  check('id', 'ID utente non valido').isMongoId()
], userController.unblockUser);

/**
 * @route   GET /api/users/:userId/is-blocked
 * @desc    Check if a user is blocked
 * @access  Private
 */
router.get('/:userId/is-blocked', [
  protect,
  check('userId', 'ID utente non valido').isMongoId()
], userController.isUserBlocked);

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role
 * @access  Private/Admin
 */
router.put('/:id/role', [
  protect,
  authorize('admin'),
  check('id', 'ID utente non valido').isMongoId(),
  check('role', 'Ruolo non valido').isIn(['user', 'admin', 'moderator'])
], userController.changeUserRole);

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user status
 * @access  Private/Admin
 */
router.put('/:id/status', [
  protect,
  authorize('admin'),
  check('id', 'ID utente non valido').isMongoId(),
  check('status', 'Stato non valido').isIn(['active', 'suspended', 'banned'])
], userController.changeUserStatus);
/**
 * @route   PUT /api/users/me/password
 * @desc    Aggiorna la password dell'utente corrente
 * @access  Private
 */
router.put('/me/password', [
  protect,
  check('currentPassword', 'Password attuale obbligatoria').not().isEmpty(),
  check('newPassword', 'Nuova password obbligatoria')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('La password deve contenere almeno 8 caratteri, una lettera maiuscola, una minuscola, un numero e un carattere speciale')
], userController.changePassword);


/**
 * @route   DELETE /api/users/me
 * @desc    Elimina l'account dell'utente corrente
 * @access  Private
 */
router.delete('/me', [
  protect,
  check('password', 'Password obbligatoria per eliminare l\'account').not().isEmpty()
], userController.deleteAccount);

/**
 * @route   PUT /api/users/me/location-from-coords
 * @desc    Update user's location address from coordinates (reverse geocoding)
 * @access  Private
 */
router.put('/me/location-from-coords', protect, userController.updateUserLocationFromCoords);

module.exports = router;