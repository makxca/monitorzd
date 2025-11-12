import { sequelize } from './sequelize';
import { Subscription} from './Subscription';

(async () => {
  await sequelize.authenticate();

  const isDev = process.env.IS_DEV === 'true';
  
  await sequelize.sync({ force: isDev });

  if (isDev) {
    await Subscription.create({
      telegramId: "123456789",
      filter: {
        departureDate: "2025-12-30T00:00:00",
        origin: [{expressCode: "2020202", nodeId: "4hg5b3h4vhlv34h5v4hv"}],
        destination: [{expressCode: "2020202", nodeId: "4hg5b3h4vhlv34h5v4hv"}],
        carType: "plaz",
        maxPrice: 12345
      }
    });
  }

  console.log('\n\n[postgres] Successfully connected');
})()

export { Subscription };
export { sequelize };
