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
    // If min_price is in Lakhs (e.g. 5), convert to actual Rupees (500000)
    const minPriceVal = criteria.min_price < 1000 ? criteria.min_price * 100000 : criteria.min_price;
    qb.andWhere('car.price_ex_showroom >= :minPrice', {
      minPrice: minPriceVal,
    });
  }

  if (criteria.max_price) {
    // If max_price is in Lakhs (e.g. 15), convert to actual Rupees (1500000)
    const maxPriceVal = criteria.max_price < 1000 ? criteria.max_price * 100000 : criteria.max_price;
    qb.andWhere('car.price_ex_showroom <= :maxPrice', {
      maxPrice: maxPriceVal,
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

  if (criteria.color) {
    const colorSearch = `%${criteria.color.toLowerCase()}%`;
    qb.andWhere('LOWER(car.colors_available::text) LIKE :colorSearch', {
      colorSearch,
    });
  }

  if (criteria.drivetrain) {
    const dtSearch = `%${criteria.drivetrain.toLowerCase()}%`;
    qb.andWhere('(LOWER(car.variant) LIKE :dtSearch OR LOWER(car.key_features::text) LIKE :dtSearch)', {
      dtSearch,
    });
  }

  if (criteria.query) {
    const q = `%${criteria.query.toLowerCase()}%`;
    qb.andWhere(
      '(LOWER(car.brand) LIKE :q OR LOWER(car.model) LIKE :q OR LOWER(car.variant) LIKE :q OR LOWER(car.key_features::text) LIKE :q OR LOWER(car.colors_available::text) LIKE :q)',
      { q }
    );
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

  if (criteria.sort_by === 'mileage') {
    qb.orderBy('car.mileage_kmpl', criteria.sort_order || 'DESC');
  } else if (criteria.sort_by === 'safety') {
    qb.orderBy('car.safety_rating', criteria.sort_order || 'DESC');
  } else if (criteria.sort_by === 'price') {
    qb.orderBy('car.price_ex_showroom', criteria.sort_order || 'ASC');
  } else {
    qb.orderBy('car.price_ex_showroom', 'ASC');
  }
  qb.limit(20);

  const cars = await qb.getMany();
  return cars;
}

module.exports = { searchCars };
