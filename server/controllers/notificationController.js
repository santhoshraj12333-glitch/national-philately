const Notification = require('../models/Notification');
const { readPaging, setPagingHeaders } = require('../utils/pagination');

const getNotifications = async (req, res) => {
  try {
    const { wantsPaging, page, limit, skip } = readPaging(req, 20);
    const total = await Notification.countDocuments({ user: req.user._id });

    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(wantsPaging ? skip : 0)
      .limit(wantsPaging ? limit : 50);

    if (wantsPaging) setPagingHeaders(res, { total, page, limit });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** A cheap counter for the navbar badge - no payload, no paging guesswork. */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
