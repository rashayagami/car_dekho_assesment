const { EntitySchema } = require('typeorm');

const Car = new EntitySchema({
  name: 'Car',
  tableName: 'cars',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
    },
    brand: {
      type: 'varchar',
    },
    model: {
      type: 'varchar',
    },
    variant: {
      type: 'varchar',
    },
    year: {
      type: 'int',
    },
    price_ex_showroom: {
      type: 'decimal',
      precision: 12,
      scale: 2,
    },
    price_on_road: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      nullable: true,
    },
    body_type: {
      type: 'varchar', // hatchback, sedan, suv, muv, coupe, convertible, pickup
    },
    fuel_type: {
      type: 'varchar', // petrol, diesel, electric, hybrid, cng
    },
    transmission: {
      type: 'varchar', // manual, automatic, imt, cvt, dct, amt
    },
    engine_displacement: {
      type: 'int',
      nullable: true, // in cc (null for EVs)
    },
    max_power: {
      type: 'varchar',
      nullable: true, // e.g. "81 bhp @ 6000 rpm"
    },
    max_torque: {
      type: 'varchar',
      nullable: true, // e.g. "113 Nm @ 4200 rpm"
    },
    mileage_kmpl: {
      type: 'decimal',
      precision: 5,
      scale: 2,
      nullable: true,
    },
    seating_capacity: {
      type: 'int',
    },
    boot_space_litres: {
      type: 'int',
      nullable: true,
    },
    ground_clearance_mm: {
      type: 'int',
      nullable: true,
    },
    safety_rating: {
      type: 'int',
      nullable: true, // NCAP 0-5
    },
    key_features: {
      type: 'jsonb',
      nullable: true, // ["sunroof", "wireless_charging", "adas", ...]
    },
    colors_available: {
      type: 'jsonb',
      nullable: true,
    },
    pros: {
      type: 'jsonb',
      nullable: true,
    },
    cons: {
      type: 'jsonb',
      nullable: true,
    },
    image_url: {
      type: 'varchar',
      nullable: true,
    },
    is_available: {
      type: 'boolean',
      default: true,
    },
    created_at: {
      type: 'timestamp',
      createDate: true,
    },
    updated_at: {
      type: 'timestamp',
      updateDate: true,
    },
  },
  indices: [
    {
      name: 'IDX_CAR_BRAND_MODEL',
      columns: ['brand', 'model'],
    },
    {
      name: 'IDX_CAR_BODY_FUEL',
      columns: ['body_type', 'fuel_type'],
    },
    {
      name: 'IDX_CAR_PRICE',
      columns: ['price_ex_showroom'],
    },
  ],
});

module.exports = { Car };
