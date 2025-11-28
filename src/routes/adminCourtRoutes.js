const express = require('express');
const router = express.Router();
const courtController = require('../controllers/courtController');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

router.post('/', auth, isAdmin, courtController.createCourt);
router.put('/:id', auth, isAdmin, courtController.updateCourt);
router.delete('/:id', auth, isAdmin, courtController.deleteCourt);
router.delete('/reset', auth, isAdmin, courtController.resetCourts);

module.exports = router;
