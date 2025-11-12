import { DataTypes, Model } from 'sequelize';
import { sequelize } from './sequelize';

interface Station {
  expressCode: string;  // код станции
  nodeId: string;       // id станции для построения URL
}

interface Filter {
  departureDate: string;       // "2025-12-30T00:00:00"
  origin: Station[];           // массив выбранных станций отправления
  destination: Station[];      // массив выбранных станций назначения
  carType: "plaz" | "coop" | "SV" | "sitting" | null;
  maxPrice: number;            // число в рублях
}

interface SubscriptionAttributes {
  telegramId: string;
  filter: Filter;
}

export class Subscription extends Model<SubscriptionAttributes> {}

Subscription.init(
  {
    telegramId: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    filter: {
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