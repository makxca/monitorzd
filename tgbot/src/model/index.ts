import { sequelize } from './sequelize';
import { Subscription} from './Subscription';

(async () => {
  await sequelize.authenticate();

  const isDev = process.env.IS_DEV === 'true';
  
  await sequelize.sync({ force: isDev });

  if (isDev) {
    await Subscription.create({
      telegramId: "123456789",
      filters: [{
        departureDate: "2025-12-30T00:00:00",
        origin: "2020202",
        originNodeId: "4hg5b3h4vhlv34h5v4hv",
        destination: "2020202",
        destinationNodeId: "4hg5b3h4vhlv34h5v4hv",
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
