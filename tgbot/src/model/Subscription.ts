import { DataTypes, Model } from 'sequelize';
import { sequelize } from './sequelize';

interface SubscriptionAttributes {
  telegramId: string;
  filters: {
    "departureDate": string // "2025-12-30T00:00:00",
    "origin": string // "2000000",
    "destination": string // "2004000",
    "carType": "plaz" | "coop" | "SV" | "sitting" | null,
    "maxPrice": 12345 // число в рублях
  }[];
}

export class Subscription extends Model<SubscriptionAttributes> {}

Subscription.init(
  {
    telegramId: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    filters: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    // created_at, updated_at, deleted_at are created automatically
  },
  {
    sequelize,
    modelName: 'Subscription',
    paranoid: true,
  },
);
