import { DataTypes, Model } from 'sequelize';
import { sequelize } from './sequelize';

interface SubscriptionAttributes {
  telegramId: string;
  filters: {
    "departureDate": string // "2025-12-30T00:00:00",
    "origin": string // "2000000",
    "originNodeId": string // "5a323c29340c7441a0a556bb", используется для построения URL страницы поиска
    "destination": string // "2004000",
    "destinationNodeId": string // "5a3244bc340c7441a0a556ca", используется для построения URL страницы поиска
    "carType": "plaz" | "coop" | "SV" | "sitting" | null,
    "maxPrice": number // число в рублях
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
    // created_at, updated_at, deleted_at добавляются автоматически
  },
  {
    sequelize,
    modelName: 'Subscription',
    paranoid: true,
  }
);