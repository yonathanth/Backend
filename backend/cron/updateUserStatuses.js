const cron = require("node-cron");
const prisma = require("../../prisma/client");

// Helper function to calculate days between two dates
const calculateDaysBetween = (date1, date2) =>
  Math.ceil((date2 - date1) / (1000 * 3600 * 24));

// Helper function to calculate countdown
const calculateCountdown = (expirationDate, remainingDays) => {
  const today = new Date();
  const daysUntilExpiration = calculateDaysBetween(today, expirationDate);
  return Math.min(daysUntilExpiration, remainingDays);
};

// Cron job to update user statuses
const updateUserStatuses = async () => {
  try {
    console.log("Starting user status update...");

    const users = await prisma.user.findMany({
      where: {
        status: { in: ["active", "expired"] },
      },
      include: {
        service: true,
      },
    });

    const updates = users.map(async (user) => {
      const { id, fullName, startDate, service, preFreezeAttendance, status } =
        user;

      if (!service) {
        console.warn(`User ${id} has no active service. Skipping.`);
        return;
      }

      const expirationDate = new Date(startDate);
      expirationDate.setDate(expirationDate.getDate() + service.period);

      const attendanceCountSinceStart = await prisma.attendance.count({
        where: { memberId: id, date: { gte: startDate } },
      });

      const remainingDays =
        service.maxDays - attendanceCountSinceStart - preFreezeAttendance;

      const countdown = calculateCountdown(expirationDate, remainingDays);

      const newStatus =
        countdown < -3 ? "inactive" : countdown < 0 ? "expired" : status;

      await prisma.user.update({
        where: { id: id },
        data: {
          daysLeft: countdown,
          status: newStatus,
        },
      });

      console.log(
        `User ${user.fullName} updated: Countdown = ${countdown}, Status = ${newStatus}`
      );
    });

    await Promise.all(updates);
    console.log("User status update completed.");
  } catch (error) {
    console.error("Error updating user statuses:", error);
  }
};

// Schedule the cron job to run daily at midnight
cron.schedule("0 0 * * *", updateUserStatuses);

module.exports = updateUserStatuses;
