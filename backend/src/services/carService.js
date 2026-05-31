const { AppDataSource } = require('../config/data-source');

/**
 * Search cars based on filter criteria from the AI.
 * Builds a dynamic TypeORM query.
 */
async function searchCars(criteria = {}) {
  const carRepo = AppDataSource.getRepository('Car');
  const qb = carRepo.createQueryBuilder('car');

  qb.where('car.is_available = :available', { available: true });

  if (criteria.min_price) {
    qb.andWhere('car.price_ex_showroom >= :minPrice', {
      minPrice: criteria.min_price,
    });
  }

  if (criteria.max_price) {
    qb.andWhere('car.price_ex_showroom <= :maxPrice', {
      maxPrice: criteria.max_price,
    });
  }

  if (criteria.body_types && criteria.body_types.length > 0) {
    qb.andWhere('car.body_type IN (:...bodyTypes)', {
      bodyTypes: criteria.body_types,
    });
  }

  if (criteria.fuel_types && criteria.fuel_types.length > 0) {
    qb.andWhere('car.fuel_type IN (:...fuelTypes)', {
      fuelTypes: criteria.fuel_types,
    });
  }

  if (criteria.transmissions && criteria.transmissions.length > 0) {
    qb.andWhere('car.transmission IN (:...transmissions)', {
      transmissions: criteria.transmissions,
    });
  }

  if (criteria.min_seating) {
    qb.andWhere('car.seating_capacity >= :minSeating', {
      minSeating: criteria.min_seating,
    });
  }

  if (criteria.brands && criteria.brands.length > 0) {
    // Case-insensitive brand matching
    qb.andWhere('LOWER(car.brand) IN (:...brands)', {
      brands: criteria.brands.map((b) => b.toLowerCase()),
    });
  }

  if (criteria.features && criteria.features.length > 0) {
    // Check if key_features jsonb array contains any of the requested features
    for (let i = 0; i < criteria.features.length; i++) {
      qb.andWhere(`car.key_features @> :feature_${i}`, {
        [`feature_${i}`]: JSON.stringify([criteria.features[i]]),
      });
    }
  }

  if (criteria.min_safety_rating) {
    qb.andWhere('car.safety_rating >= :minSafety', {
      minSafety: criteria.min_safety_rating,
    });
  }

  if (criteria.min_mileage) {
    qb.andWhere('car.mileage_kmpl >= :minMileage', {
      minMileage: criteria.min_mileage,
    });
  }

  qb.orderBy('car.price_ex_showroom', 'ASC');
  qb.limit(20);

  const cars = await qb.getMany();
  return cars;
}

module.exports = { searchCars };
