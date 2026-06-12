const Screen = require('../models/screen.model');

class ScreenController {
    // Create a new screen
    async createScreen(req, res) {
        try {
            const { name, theater } = req.body;

            // check duplicate name
            const existing = await Screen.findOne({ name, theater });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Screen name already exists',
                });
            }
            const screen = new Screen(req.body);
            const saved = await screen.save();

            res.status(201).json({
                success: true,
                data: saved,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get list of all screens
    async getScreenList(req, res) {
        try {
            const screens = await Screen.find().populate('theater');

            res.json({
                success: true,
                data: screens,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get details of a specific screen
    async getScreenDetail(req, res) {
        try {
            const screen = await Screen.findById(req.params.id).populate('theater');

            if (!screen) return res.status(404).json({ message: 'Screen not found' });

            res.json({
                success: true,
                data: screen,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Update a screen's information
    async updateScreen(req, res) {
        try {
            const screen = await Screen.findByIdAndUpdate(req.params.id, req.body, { new: true });

            res.json({
                success: true,
                data: screen,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Delete a screen
    async deleteScreen(req, res) {
        try {
            await Screen.findByIdAndDelete(req.params.id);

            res.json({
                success: true,
                message: 'Screen deleted',
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new ScreenController();
