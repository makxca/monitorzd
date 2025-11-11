import { sequelize } from './sequelize';
import { Subscription } from './Subscription';

(async () => {
  await sequelize.authenticate();

  const isDev = process.env.IS_DEV === 'true';
  
  await sequelize.sync({ force: isDev });

  if (isDev) {
    await Subscription.create({
      telegramId: "123456789",
      filters: [{
        departureDate: "2025-12-30T00:00:00",
        origin: "2000000",
        destination: "2004000",
        carType: "plaz",
        maxPrice: 92345,
        originNodeId: "5a323c29340c7441a0a556bb",
        destinationNodeId: "5a3244bc340c7441a0a556ca",
      }]
    });
  }

  console.log('\n\n[postgres] Successfully connected');
})()

export { Subscription };
export { sequelize };
