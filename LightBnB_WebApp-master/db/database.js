const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require('pg');
const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = (email) => {

  return pool
    .query('SELECT * FROM users WHERE email = $1', [email])
    .then((result) => {
      if (result.rows.length > 0) {
        // console.log(result.rows[0]);
        return result.rows[0];
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.log(err.message);
      throw err;
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */

const getUserWithId = (id) => {

  return pool
    .query('SELECT * FROM users WHERE id = $1', [id])
    .then((result) => {
      if (result.rows.length > 0) {
        // console.log(result.rows[0]);
        return result.rows[0];
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.log(err.message);
      throw err;
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */

const addUser = ({name, email, password}) => {
  return pool
    .query('INSERT INTO users(name, email, password) VALUES($1, $2, $3) RETURNING *', [name, email, password])
    .then((result) => {
      if (result.rows.length > 0) {
        //console.log(result.rows[0]);
        return result.rows[0];
      }
    })
    .catch((err) => {
      console.log(err.message);
      throw err;
    })
};



/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */

const getAllReservations = (guest_id, limit = 10) => {
  return pool
    .query(`SELECT reservations.*, properties.*, AVG(rating) AS average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    GROUP BY reservations.id, properties.id
    ORDER BY reservations.start_date
    LIMIT $2;`, [guest_id, limit])
    .then((result) => {
      // console.log(result.rows);
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = function (options, limit = 10) {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
    SELECT properties.*, AVG(property_reviews.rating) AS average_rating
    FROM properties
    LEFT JOIN property_reviews ON properties.id = property_id
  `;

  // 3
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `WHERE owner_id = $${queryParams.length} `;
  }

  // 4
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `${queryParams.length > 1 ? 'AND' : 'WHERE'} city LIKE $${queryParams.length} `;
  }

  // 5
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100); // Convert to cents
    queryParams.push(options.maximum_price_per_night * 100); // Convert to cents
    queryString += `${queryParams.length > 1 ? 'AND' : 'WHERE'} cost_per_night >= $${queryParams.length - 1} AND cost_per_night <= $${queryParams.length} `;
  } else if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100); // Convert to cents
    queryString += `${queryParams.length > 1 ? 'AND' : 'WHERE'} cost_per_night >= $${queryParams.length} `;
  } else if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100); // Convert to cents
    queryString += `${queryParams.length > 1 ? 'AND' : 'WHERE'} cost_per_night <= $${queryParams.length} `;
  }

  // 6
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `${queryParams.length > 1 ? 'AND' : 'WHERE'} property_reviews.rating >= $${queryParams.length} `;
  }

  // 7
  queryParams.push(limit);
  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;

  // 8
  console.log(queryString, queryParams);

  // 9
  return pool.query(queryString, queryParams).then((res) => res.rows);
};


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
